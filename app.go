package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx         context.Context
	storagePath string
	configPath  string
}

// AppConfig stores user preferences
type AppConfig struct {
	StoragePath      string `json:"storagePath"`
	Theme            string `json:"theme,omitempty"`
	Language         string `json:"language,omitempty"`
	AutoSave         bool   `json:"autoSave,omitempty"`
	EditorFontSize   int    `json:"editorFontSize,omitempty"`
	EditorFontFamily string `json:"editorFontFamily,omitempty"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.initConfig()
	
	// Setup window close handler to minimize instead of close
	// This is done via macOS menu bar behavior
}

// initConfig initializes configuration
func (a *App) initConfig() {
	// Config file in Application Support
	homeDir, _ := os.UserHomeDir()
	a.configPath = filepath.Join(homeDir, "Library", "Application Support", "MacDevTools", "config.json")

	// Ensure config directory exists
	os.MkdirAll(filepath.Dir(a.configPath), 0755)

	// Load config or use default
	config := a.loadConfig()
	if config.StoragePath == "" {
		// Default to Documents/MacDevTools
		config.StoragePath = filepath.Join(homeDir, "Documents", "MacDevTools")
		a.saveConfig(config)
	}
	a.storagePath = config.StoragePath

	// Ensure storage directory and subdirectories exist
	a.initStorageDirectories()
}

// loadConfig loads configuration from file
func (a *App) loadConfig() AppConfig {
	config := AppConfig{}
	data, err := os.ReadFile(a.configPath)
	if err == nil {
		json.Unmarshal(data, &config)
	}
	return config
}

// saveConfig saves configuration to file
func (a *App) saveConfig(config AppConfig) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.configPath, data, 0644)
}

// initStorageDirectories creates the storage directory structure
func (a *App) initStorageDirectories() {
	dirs := []string{"json", "xml", "base64", "http"}
	for _, dir := range dirs {
		os.MkdirAll(filepath.Join(a.storagePath, dir), 0755)
	}
}

// ========== File Dialog Methods (Native macOS Dialogs) ==========

// OpenFileDialog shows native macOS file picker for import
func (a *App) OpenFileDialog() (string, error) {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Backup File",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", err
	}

	// Read file content
	content, err := os.ReadFile(file)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	return string(content), nil
}

// SaveFileDialog shows native macOS file save dialog
func (a *App) SaveFileDialog(data string) error {
	filename := fmt.Sprintf("MacDevTools_Backup_%s.json", time.Now().Format("2006-01-02"))

	file, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Backup File",
		DefaultFilename: filename,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "JSON Files (*.json)",
				Pattern:     "*.json",
			},
		},
	})

	if err != nil {
		return err
	}

	// If user cancelled, file will be empty
	if file == "" {
		return nil
	}

	// Write data to file with restricted permissions
	return os.WriteFile(file, []byte(data), 0600)
}

// ShowUnsavedChangesDialog displays a dialog for unsaved changes.
// It returns "save", "dontsave", or "cancel".
func (a *App) ShowUnsavedChangesDialog(fileName string) (string, error) {
	return runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    runtime.QuestionDialog,
		Title:   "未保存的更改",
		Message: fmt.Sprintf("是否保存对 %s 所做的更改？", fileName),
		Buttons: []string{"保存", "不保存", "取消"},
	})
}

// ShowDeleteConfirmDialog displays a native confirmation dialog for deletion.
// It returns "yes" if user confirms, "no" or "cancel" otherwise.
func (a *App) ShowDeleteConfirmDialog(message string) (string, error) {
	return runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    runtime.WarningDialog,
		Title:   "确认删除",
		Message: message,
		Buttons: []string{"删除", "取消"},
		DefaultButton: "取消",
		CancelButton:  "取消",
	})
}

// ShowConfirmDialog displays a native confirmation dialog.
// It returns "确定" if user confirms, "取消" otherwise.
func (a *App) ShowConfirmDialog(title string, message string) (string, error) {
	return runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    runtime.QuestionDialog,
		Title:   title,
		Message: message,
		Buttons: []string{"确定", "取消"},
		DefaultButton: "确定",
		CancelButton:  "取消",
	})
}

// ShowMessageDialog displays a native message dialog.
func (a *App) ShowMessageDialog(title string, message string) (string, error) {
	return runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    runtime.InfoDialog,
		Title:   title,
		Message: message,
		Buttons: []string{"确定"},
		DefaultButton: "确定",
	})
}

// ========== JSON Tools ==========

type JSONFormatRequest struct {
	Content string `json:"content"`
}

type JSONFormatResponse struct {
	Result string `json:"result"`
	Error  string `json:"error"`
}

// FormatJSON formats JSON with indentation while preserving key order.
func (a *App) FormatJSON(content string) JSONFormatResponse {
	var out bytes.Buffer
	err := json.Indent(&out, []byte(content), "", "  ")
	if err != nil {
		// If Indent fails, it means the JSON is invalid. We can provide a more specific error.
		return JSONFormatResponse{
			Result: "",
			Error:  fmt.Sprintf("Invalid JSON format: %v", err),
		}
	}

	return JSONFormatResponse{
		Result: out.String(),
		Error:  "",
	}
}

// CompressJSON removes all whitespace
func (a *App) CompressJSON(content string) JSONFormatResponse {
	var data interface{}

	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return JSONFormatResponse{
			Result: "",
			Error:  fmt.Sprintf("Invalid JSON: %v", err),
		}
	}

	compressed, err := json.Marshal(data)
	if err != nil {
		return JSONFormatResponse{
			Result: "",
			Error:  fmt.Sprintf("Compress error: %v", err),
		}
	}

	return JSONFormatResponse{
		Result: string(compressed),
		Error:  "",
	}
}

// ========== XML Tools ==========

// FormatXML formats XML with indentation
func (a *App) FormatXML(content string) JSONFormatResponse {
	// Remove leading/trailing whitespace
	content = strings.TrimSpace(content)

	// Parse XML
	decoder := xml.NewDecoder(strings.NewReader(content))
	var buf strings.Builder
	encoder := xml.NewEncoder(&buf)
	encoder.Indent("", "  ")

	for {
		token, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return JSONFormatResponse{
				Result: "",
				Error:  fmt.Sprintf("Invalid XML: %v", err),
			}
		}
		if err := encoder.EncodeToken(token); err != nil {
			return JSONFormatResponse{
				Result: "",
				Error:  fmt.Sprintf("Format error: %v", err),
			}
		}
	}

	if err := encoder.Flush(); err != nil {
		return JSONFormatResponse{
			Result: "",
			Error:  fmt.Sprintf("Flush error: %v", err),
		}
	}

	return JSONFormatResponse{
		Result: buf.String(),
		Error:  "",
	}
}

// XMLToJSON converts XML to JSON with proper structure preservation
func (a *App) XMLToJSON(content string) JSONFormatResponse {
	content = strings.TrimSpace(content)

	decoder := xml.NewDecoder(strings.NewReader(content))
	result, err := xmlToMap(decoder, nil)
	if err != nil {
		return JSONFormatResponse{
			Result: "",
			Error:  fmt.Sprintf("XML conversion error: %v", err),
		}
	}

	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return JSONFormatResponse{
			Result: "",
			Error:  fmt.Sprintf("JSON marshal error: %v", err),
		}
	}

	return JSONFormatResponse{
		Result: string(jsonData),
		Error:  "",
	}
}

// xmlToMap recursively converts XML to a map structure
func xmlToMap(decoder *xml.Decoder, start *xml.StartElement) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	var currentElement string
	var textContent strings.Builder

	for {
		token, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}

		switch t := token.(type) {
		case xml.StartElement:
			if start == nil {
				// Root element
				child, err := xmlToMap(decoder, &t)
				if err != nil {
					return nil, err
				}
				// Add attributes
				if len(t.Attr) > 0 {
					attrs := make(map[string]string)
					for _, attr := range t.Attr {
						attrs[attr.Name.Local] = attr.Value
					}
					child["@attributes"] = attrs
				}
				result[t.Name.Local] = child
			} else {
				currentElement = t.Name.Local
				child, err := xmlToMap(decoder, &t)
				if err != nil {
					return nil, err
				}
				// Add attributes
				if len(t.Attr) > 0 {
					attrs := make(map[string]string)
					for _, attr := range t.Attr {
						attrs[attr.Name.Local] = attr.Value
					}
					child["@attributes"] = attrs
				}
				// Handle multiple elements with same name
				if existing, ok := result[currentElement]; ok {
					switch v := existing.(type) {
					case []interface{}:
						result[currentElement] = append(v, child)
					default:
						result[currentElement] = []interface{}{v, child}
					}
				} else {
					result[currentElement] = child
				}
			}
		case xml.CharData:
			text := strings.TrimSpace(string(t))
			if text != "" {
				textContent.WriteString(text)
			}
		case xml.EndElement:
			if start != nil && t.Name.Local == start.Name.Local {
				// Return text content if no children
				if len(result) == 0 && textContent.Len() > 0 {
					result["#text"] = textContent.String()
				} else if textContent.Len() > 0 {
					result["#text"] = textContent.String()
				}
				return result, nil
			}
		}
	}

	return result, nil
}

// ========== Base64 Tools ==========

// EncodeBase64 encodes string to base64
func (a *App) EncodeBase64(content string) JSONFormatResponse {
	encoded := base64.StdEncoding.EncodeToString([]byte(content))
	return JSONFormatResponse{
		Result: encoded,
		Error:  "",
	}
}

// DecodeBase64 decodes base64 to string
func (a *App) DecodeBase64(content string) JSONFormatResponse {
	// Remove whitespace that might be in the input
	content = strings.TrimSpace(content)

	decoded, err := base64.StdEncoding.DecodeString(content)
	if err != nil {
		return JSONFormatResponse{
			Result: "",
			Error:  fmt.Sprintf("Invalid Base64: %v", err),
		}
	}

	// Check if decoded content is valid UTF-8
	result := string(decoded)
	if !isValidUTF8(decoded) {
		return JSONFormatResponse{
			Result: result,
			Error:  "Warning: Decoded content contains non-UTF-8 characters",
		}
	}

	return JSONFormatResponse{
		Result: result,
		Error:  "",
	}
}

// isValidUTF8 checks if byte slice is valid UTF-8
func isValidUTF8(data []byte) bool {
	for len(data) > 0 {
		r, size := rune(data[0]), 1
		if r >= 0x80 {
			r, size = rune(0xFFFD), 1
			if data[0]&0xE0 == 0xC0 && len(data) >= 2 && data[1]&0xC0 == 0x80 {
				r, size = rune(data[0]&0x1F)<<6|rune(data[1]&0x3F), 2
			} else if data[0]&0xF0 == 0xE0 && len(data) >= 3 && data[1]&0xC0 == 0x80 && data[2]&0xC0 == 0x80 {
				r, size = rune(data[0]&0x0F)<<12|rune(data[1]&0x3F)<<6|rune(data[2]&0x3F), 3
			} else if data[0]&0xF8 == 0xF0 && len(data) >= 4 && data[1]&0xC0 == 0x80 && data[2]&0xC0 == 0x80 && data[3]&0xC0 == 0x80 {
				r, size = rune(data[0]&0x07)<<18|rune(data[1]&0x3F)<<12|rune(data[2]&0x3F)<<6|rune(data[3]&0x3F), 4
			}
		}
		if r == 0xFFFD && size == 1 {
			return false
		}
		data = data[size:]
	}
	return true
}

// ========== HTTP Tools ==========

type HTTPRequest struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

type HTTPResponse struct {
	Status     string            `json:"status"`
	StatusCode int               `json:"statusCode"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	Error      string            `json:"error"`
	Duration   int64             `json:"duration"` // Duration in milliseconds
}

// SendHTTPRequest sends HTTP request and returns response
func (a *App) SendHTTPRequest(request HTTPRequest) HTTPResponse {
	// Record start time
	startTime := time.Now()
	
	// Validate URL
	if request.URL == "" {
		return HTTPResponse{
			Error:    "URL is required",
			Duration: 0,
		}
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create request
	req, err := http.NewRequest(request.Method, request.URL, strings.NewReader(request.Body))
	if err != nil {
		duration := time.Since(startTime).Milliseconds()
		return HTTPResponse{
			Error:    fmt.Sprintf("Invalid request: %v", err),
			Duration: duration,
		}
	}

	// Add headers
	for key, value := range request.Headers {
		req.Header.Set(key, value)
	}

	// Send request
	resp, err := client.Do(req)
	duration := time.Since(startTime).Milliseconds()
	
	if err != nil {
		// Provide more specific error messages
		errMsg := err.Error()
		if strings.Contains(errMsg, "timeout") {
			return HTTPResponse{
				Error:    "Request timeout: server did not respond within 30 seconds",
				Duration: duration,
			}
		}
		if strings.Contains(errMsg, "connection refused") {
			return HTTPResponse{
				Error:    fmt.Sprintf("Connection refused: unable to connect to %s", request.URL),
				Duration: duration,
			}
		}
		if strings.Contains(errMsg, "no such host") {
			return HTTPResponse{
				Error:    fmt.Sprintf("DNS error: host not found for %s", request.URL),
				Duration: duration,
			}
		}
		return HTTPResponse{
			Error:    fmt.Sprintf("Request failed: %v", err),
			Duration: duration,
		}
	}
	defer resp.Body.Close()

	// Limit response body size to 10MB to prevent memory issues
	const maxBodySize = 10 * 1024 * 1024
	limitedReader := io.LimitReader(resp.Body, maxBodySize)

	body, err := io.ReadAll(limitedReader)
	if err != nil {
		return HTTPResponse{
			Error:    fmt.Sprintf("Failed to read response: %v", err),
			Duration: duration,
		}
	}

	// Check if response was truncated
	if len(body) == maxBodySize {
		return HTTPResponse{
			Error:    "Response body exceeds 10MB limit and was truncated",
			Duration: duration,
		}
	}

	// Extract response headers
	headers := make(map[string]string)
	for key, values := range resp.Header {
		headers[key] = strings.Join(values, ", ")
	}

	return HTTPResponse{
		Status:     resp.Status,
		StatusCode: resp.StatusCode,
		Headers:    headers,
		Body:       string(body),
		Error:      "",
		Duration:   duration,
	}
}

// ========== System Info ==========

// GetSystemInfo returns system information for About dialog
func (a *App) GetSystemInfo() map[string]string {
	return map[string]string{
		"version":   "1.0.0",
		"platform":  "macOS",
		"goVersion": "1.21+",
		"author":    "Keben",
		"license":   "MIT",
	}
}

// ========== File System Operations ==========

// FileItem represents a file or folder
type FileItem struct {
	ID       string     `json:"id"`
	Name     string     `json:"name"`
	Type     string     `json:"type"` // "file" or "folder"
	Path     string     `json:"path"`
	Children []FileItem `json:"children,omitempty"`
	Expanded bool       `json:"expanded,omitempty"`
}

// FileSystemResponse is the response for file system operations
type FileSystemResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	Data    any    `json:"data,omitempty"`
}

// GetStoragePath returns the current storage path
func (a *App) GetStoragePath() string {
	return a.storagePath
}

// GetUserSettings returns user settings from config file
func (a *App) GetUserSettings() map[string]interface{} {
	config := a.loadConfig()
	return map[string]interface{}{
		"theme":            config.Theme,
		"language":         config.Language,
		"autoSave":         config.AutoSave,
		"editorFontSize":   config.EditorFontSize,
		"editorFontFamily": config.EditorFontFamily,
	}
}

// SaveUserSettings saves user settings to config file
func (a *App) SaveUserSettings(settings map[string]interface{}) FileSystemResponse {
	config := a.loadConfig()
	
	// Update config with new settings
	if theme, ok := settings["theme"].(string); ok && theme != "" {
		config.Theme = theme
	}
	if language, ok := settings["language"].(string); ok && language != "" {
		config.Language = language
	}
	if autoSave, ok := settings["autoSave"].(bool); ok {
		config.AutoSave = autoSave
	}
	if fontSize, ok := settings["editorFontSize"].(float64); ok && fontSize > 0 {
		config.EditorFontSize = int(fontSize)
	}
	if fontFamily, ok := settings["editorFontFamily"].(string); ok && fontFamily != "" {
		config.EditorFontFamily = fontFamily
	}
	
	err := a.saveConfig(config)
	if err != nil {
		return FileSystemResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to save settings: %v", err),
		}
	}
	
	return FileSystemResponse{Success: true}
}

// SetStoragePath sets a new storage path
func (a *App) SetStoragePath(newPath string) FileSystemResponse {
	// Expand ~ to home directory
	if strings.HasPrefix(newPath, "~") {
		homeDir, _ := os.UserHomeDir()
		newPath = filepath.Join(homeDir, newPath[1:])
	}

	// Create the directory if it doesn't exist
	if err := os.MkdirAll(newPath, 0755); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to create directory: %v", err)}
	}

	// Update config (preserve existing settings)
	config := a.loadConfig()
	config.StoragePath = newPath
	a.storagePath = newPath
	if err := a.saveConfig(config); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to save config: %v", err)}
	}

	// Initialize subdirectories
	a.initStorageDirectories()

	return FileSystemResponse{Success: true}
}

// SelectStorageDirectory opens a directory picker dialog
func (a *App) SelectStorageDirectory() (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Storage Directory",
	})
	return dir, err
}

// ReadDirectory reads the directory structure for a tool
func (a *App) ReadDirectory(tool string) FileSystemResponse {
	toolPath := filepath.Join(a.storagePath, tool)

	// Ensure directory exists
	if err := os.MkdirAll(toolPath, 0755); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to create directory: %v", err)}
	}

	items, err := a.readDirRecursive(toolPath, tool)
	if err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to read directory: %v", err)}
	}

	return FileSystemResponse{Success: true, Data: items}
}

// readDirRecursive recursively reads a directory
func (a *App) readDirRecursive(dirPath string, tool string) ([]FileItem, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var items []FileItem

	// Sort: folders first, then files, alphabetically
	sort.Slice(entries, func(i, j int) bool {
		iDir := entries[i].IsDir()
		jDir := entries[j].IsDir()
		if iDir != jDir {
			return iDir
		}
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		// Skip hidden files
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		fullPath := filepath.Join(dirPath, entry.Name())
		relPath, _ := filepath.Rel(a.storagePath, fullPath)

		item := FileItem{
			ID:   relPath, // Use relative path as ID
			Name: entry.Name(),
			Path: fullPath,
		}

		if entry.IsDir() {
			item.Type = "folder"
			item.Expanded = false
			children, err := a.readDirRecursive(fullPath, tool)
			if err == nil {
				item.Children = children
			}
		} else {
			item.Type = "file"
		}

		items = append(items, item)
	}

	return items, nil
}

// CreateFile creates a new file with auto-increment name if exists
func (a *App) CreateFile(tool string, parentPath string, fileName string) FileSystemResponse {
	var dirPath string
	if parentPath == "" {
		dirPath = filepath.Join(a.storagePath, tool)
	} else {
		dirPath = parentPath
	}

	// Ensure directory exists
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to create directory: %v", err)}
	}

	// Generate unique file name
	baseName := strings.TrimSuffix(fileName, filepath.Ext(fileName))
	ext := filepath.Ext(fileName)
	finalName := fileName
	filePath := filepath.Join(dirPath, finalName)

	counter := 1
	for {
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			break
		}
		finalName = fmt.Sprintf("%s_%d%s", baseName, counter, ext)
		filePath = filepath.Join(dirPath, finalName)
		counter++
	}

	// Create empty file
	file, err := os.Create(filePath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to create file: %v", err)}
	}
	file.Close()

	relPath, _ := filepath.Rel(a.storagePath, filePath)
	return FileSystemResponse{
		Success: true,
		Data: FileItem{
			ID:   relPath,
			Name: finalName,
			Type: "file",
			Path: filePath,
		},
	}
}

// CreateFolder creates a new folder with auto-increment name if exists
func (a *App) CreateFolder(tool string, parentPath string, folderName string) FileSystemResponse {
	var dirPath string
	if parentPath == "" {
		dirPath = filepath.Join(a.storagePath, tool)
	} else {
		dirPath = parentPath
	}

	// Ensure parent directory exists
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to create parent directory: %v", err)}
	}

	// Generate unique folder name
	finalName := folderName
	folderPath := filepath.Join(dirPath, finalName)

	counter := 1
	for {
		if _, err := os.Stat(folderPath); os.IsNotExist(err) {
			break
		}
		finalName = fmt.Sprintf("%s_%d", folderName, counter)
		folderPath = filepath.Join(dirPath, finalName)
		counter++
	}

	// Create folder
	if err := os.Mkdir(folderPath, 0755); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to create folder: %v", err)}
	}

	relPath, _ := filepath.Rel(a.storagePath, folderPath)
	return FileSystemResponse{
		Success: true,
		Data: FileItem{
			ID:       relPath,
			Name:     finalName,
			Type:     "folder",
			Path:     folderPath,
			Children: []FileItem{},
			Expanded: true,
		},
	}
}

// DeleteItem deletes a file or folder
func (a *App) DeleteItem(itemPath string) FileSystemResponse {
	log.Printf("DeleteItem called with path: %s", itemPath)
	
	// Security check: ensure path is within storage directory
	absPath, err := filepath.Abs(itemPath)
	if err != nil {
		log.Printf("DeleteItem: Invalid path - %v", err)
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Invalid path: %v", err)}
	}

	absStorage, _ := filepath.Abs(a.storagePath)
	log.Printf("DeleteItem: absPath=%s, absStorage=%s", absPath, absStorage)
	
	if !strings.HasPrefix(absPath, absStorage) {
		log.Printf("DeleteItem: Access denied - path outside storage directory")
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Access denied: path outside storage directory. Path: %s, Storage: %s", absPath, absStorage)}
	}

	// Check if file/folder exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		log.Printf("DeleteItem: File/folder does not exist: %s", absPath)
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("File or folder does not exist: %s", absPath)}
	}

	// Delete file or folder
	log.Printf("DeleteItem: Attempting to delete: %s", absPath)
	if err := os.RemoveAll(absPath); err != nil {
		log.Printf("DeleteItem: Failed to delete - %v", err)
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to delete: %v", err)}
	}

	log.Printf("DeleteItem: Successfully deleted: %s", absPath)
	return FileSystemResponse{Success: true}
}

// RenameItem renames a file or folder
func (a *App) RenameItem(itemPath string, newName string) FileSystemResponse {
	// Security check
	absPath, err := filepath.Abs(itemPath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Invalid path"}
	}

	absStorage, _ := filepath.Abs(a.storagePath)
	if !strings.HasPrefix(absPath, absStorage) {
		return FileSystemResponse{Success: false, Error: "Access denied: path outside storage directory"}
	}

	// Get the directory of the item
	dir := filepath.Dir(absPath)
	newPath := filepath.Join(dir, newName)

	// Check if target already exists
	if _, err := os.Stat(newPath); err == nil {
		return FileSystemResponse{Success: false, Error: "A file or folder with that name already exists"}
	}

	// Rename
	if err := os.Rename(absPath, newPath); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to rename: %v", err)}
	}

	relPath, _ := filepath.Rel(a.storagePath, newPath)
	return FileSystemResponse{
		Success: true,
		Data: map[string]string{
			"id":      relPath,
			"path":    newPath,
			"newName": newName,
		},
	}
}

// ReadFileContent reads the content of a file
func (a *App) ReadFileContent(filePath string) FileSystemResponse {
	// Security check
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Invalid path"}
	}

	absStorage, _ := filepath.Abs(a.storagePath)
	if !strings.HasPrefix(absPath, absStorage) {
		return FileSystemResponse{Success: false, Error: "Access denied"}
	}

	content, err := os.ReadFile(absPath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to read file: %v", err)}
	}

	return FileSystemResponse{Success: true, Data: string(content)}
}

// SaveFileContent saves content to a file
func (a *App) SaveFileContent(filePath string, content string) FileSystemResponse {
	// Security check
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Invalid path"}
	}

	absStorage, _ := filepath.Abs(a.storagePath)
	if !strings.HasPrefix(absPath, absStorage) {
		return FileSystemResponse{Success: false, Error: "Access denied"}
	}

	if err := os.WriteFile(absPath, []byte(content), 0644); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to save file: %v", err)}
	}

	return FileSystemResponse{Success: true}
}

// OpenInFinder opens the file or folder in macOS Finder
func (a *App) OpenInFinder(itemPath string) FileSystemResponse {
	// Security check
	absPath, err := filepath.Abs(itemPath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Invalid path"}
	}

	absStorage, _ := filepath.Abs(a.storagePath)
	if !strings.HasPrefix(absPath, absStorage) {
		return FileSystemResponse{Success: false, Error: "Access denied"}
	}

	// Use open -R to reveal in Finder
	cmd := exec.Command("open", "-R", absPath)
	if err := cmd.Run(); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to open in Finder: %v", err)}
	}

	return FileSystemResponse{Success: true}
}

// OpenStorageInFinder opens the storage directory in Finder
func (a *App) OpenStorageInFinder() FileSystemResponse {
	cmd := exec.Command("open", a.storagePath)
	if err := cmd.Run(); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to open in Finder: %v", err)}
	}
	return FileSystemResponse{Success: true}
}

// CopyItem copies a file or folder to the same directory with a new name
func (a *App) CopyItem(srcPath string, destPath string) FileSystemResponse {
	// Security check
	absSrc, err := filepath.Abs(srcPath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Invalid source path"}
	}

	absDest, err := filepath.Abs(destPath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Invalid destination path"}
	}

	absStorage, _ := filepath.Abs(a.storagePath)
	if !strings.HasPrefix(absSrc, absStorage) || !strings.HasPrefix(absDest, absStorage) {
		return FileSystemResponse{Success: false, Error: "Access denied: path outside storage directory"}
	}

	// Check if source exists
	srcInfo, err := os.Stat(absSrc)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Source does not exist"}
	}

	// Generate unique destination name
	destDir := filepath.Dir(absDest)
	destName := filepath.Base(absDest)
	ext := filepath.Ext(destName)
	baseName := strings.TrimSuffix(destName, ext)

	finalPath := absDest
	counter := 1
	for {
		if _, err := os.Stat(finalPath); os.IsNotExist(err) {
			break
		}
		if srcInfo.IsDir() {
			finalPath = filepath.Join(destDir, fmt.Sprintf("%s_copy_%d", baseName, counter))
		} else {
			finalPath = filepath.Join(destDir, fmt.Sprintf("%s_copy_%d%s", baseName, counter, ext))
		}
		counter++
	}

	// Copy
	if srcInfo.IsDir() {
		err = copyDir(absSrc, finalPath)
	} else {
		err = copyFile(absSrc, finalPath)
	}

	if err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to copy: %v", err)}
	}

	relPath, _ := filepath.Rel(a.storagePath, finalPath)
	return FileSystemResponse{
		Success: true,
		Data: map[string]string{
			"id":   relPath,
			"path": finalPath,
			"name": filepath.Base(finalPath),
		},
	}
}

// DuplicateItem creates a copy in the same directory
func (a *App) DuplicateItem(srcPath string) FileSystemResponse {
	return a.CopyItem(srcPath, srcPath)
}

// MoveItem moves a file or folder to a new location
func (a *App) MoveItem(srcPath string, destDir string) FileSystemResponse {
	// Security check
	absSrc, err := filepath.Abs(srcPath)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Invalid source path"}
	}

	absDest, err := filepath.Abs(destDir)
	if err != nil {
		return FileSystemResponse{Success: false, Error: "Invalid destination path"}
	}

	absStorage, _ := filepath.Abs(a.storagePath)
	if !strings.HasPrefix(absSrc, absStorage) || !strings.HasPrefix(absDest, absStorage) {
		return FileSystemResponse{Success: false, Error: "Access denied: path outside storage directory"}
	}

	// Get file name
	fileName := filepath.Base(absSrc)
	newPath := filepath.Join(absDest, fileName)

	// Check for name collision
	if _, err := os.Stat(newPath); err == nil {
		return FileSystemResponse{Success: false, Error: "A file with that name already exists in the destination"}
	}

	// Move
	if err := os.Rename(absSrc, newPath); err != nil {
		return FileSystemResponse{Success: false, Error: fmt.Sprintf("Failed to move: %v", err)}
	}

	relPath, _ := filepath.Rel(a.storagePath, newPath)
	return FileSystemResponse{
		Success: true,
		Data: map[string]string{
			"id":   relPath,
			"path": newPath,
			"name": fileName,
		},
	}
}

// copyFile copies a single file
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	if err != nil {
		return err
	}

	// Copy file permissions
	srcInfo, err := os.Stat(src)
	if err != nil {
		return err
	}
	return os.Chmod(dst, srcInfo.Mode())
}

// copyDir copies a directory recursively
func copyDir(src, dst string) error {
	srcInfo, err := os.Stat(src)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(dst, srcInfo.Mode()); err != nil {
		return err
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			if err := copyDir(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			if err := copyFile(srcPath, dstPath); err != nil {
				return err
			}
		}
	}

	return nil
}

// ========== Clipboard Operations ==========
 
// ClipboardResponse represents clipboard operation response
type ClipboardResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	Data    string `json:"data,omitempty"`
}

// ClipboardCopy copies text to system clipboard
func (a *App) ClipboardCopy(text string) ClipboardResponse {
	if text == "" {
		return ClipboardResponse{Success: false, Error: "Cannot copy empty text"}
	}

	// Use macOS pbcopy command
	cmd := exec.Command("pbcopy")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return ClipboardResponse{Success: false, Error: fmt.Sprintf("Failed to create clipboard pipe: %v", err)}
	}

	if err := cmd.Start(); err != nil {
		return ClipboardResponse{Success: false, Error: fmt.Sprintf("Failed to start clipboard command: %v", err)}
	}

	if _, err := stdin.Write([]byte(text)); err != nil {
		stdin.Close()
		return ClipboardResponse{Success: false, Error: fmt.Sprintf("Failed to write to clipboard: %v", err)}
	}

	stdin.Close()

	if err := cmd.Wait(); err != nil {
		return ClipboardResponse{Success: false, Error: fmt.Sprintf("Failed to copy to clipboard: %v", err)}
	}

	return ClipboardResponse{Success: true}
}

// ClipboardPaste reads text from system clipboard
func (a *App) ClipboardPaste() ClipboardResponse {
	// Set environment variables to ensure UTF-8 encoding
	env := os.Environ()
	cmd := exec.Command("pbpaste")
	cmd.Env = append(env, "LC_ALL=en_US.UTF-8", "LANG=en_US.UTF-8")
	
	output, err := cmd.Output()
	if err != nil {
		return ClipboardResponse{Success: false, Error: fmt.Sprintf("Failed to read clipboard: %v", err)}
	}

	// Convert bytes to UTF-8 string properly
	text := string(output)
	
	// Clean up any invalid UTF-8 sequences by replacing with replacement character
	cleanText := strings.ToValidUTF8(text, "")
	
	// Trim any leading/trailing whitespace and null bytes
	finalText := strings.TrimSpace(cleanText)
	finalText = strings.ReplaceAll(finalText, "\x00", "")
	
	return ClipboardResponse{
		Success: true,
		Data:    finalText,
	}
}

// ClipboardCut is equivalent to copy + clear selection (text needs to be provided)
func (a *App) ClipboardCut(text string) ClipboardResponse {
	// First copy to clipboard
	copyResult := a.ClipboardCopy(text)
	if !copyResult.Success {
		return copyResult
	}

	// Note: In a real text editor scenario, you would also need to clear the selection
	// This would typically be handled by the frontend by deleting the selected text
	return ClipboardResponse{Success: true, Data: text}
}

// SearchResult represents a search match
type SearchResult struct {
	FileID   string `json:"fileId"`
	FileName string `json:"fileName"`
	ToolName string `json:"toolName"`
	Count    int    `json:"count"`
}

// GlobalSearch searches for a string in all files
func (a *App) GlobalSearch(query string) []SearchResult {
	var results []SearchResult
	if query == "" {
		return results
	}
	// Case-insensitive search
	query = strings.ToLower(query)

	dirs := []string{"json", "xml", "base64", "http"}
	for _, tool := range dirs {
		toolPath := filepath.Join(a.storagePath, tool)
		
		// Walk through directory
		filepath.Walk(toolPath, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				return nil
			}
			// Skip hidden files
			if strings.HasPrefix(info.Name(), ".") {
				return nil
			}

			// Read file content
			contentBytes, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			content := strings.ToLower(string(contentBytes))

			// Count matches
			count := strings.Count(content, query)
			if count > 0 {
				relPath, _ := filepath.Rel(a.storagePath, path)
				results = append(results, SearchResult{
					FileID:   relPath,
					FileName: info.Name(),
					ToolName: tool,
					Count:    count,
				})
			}
			return nil
		})
	}
	return results
}