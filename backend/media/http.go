package media

import (
	"autora-backend/mw"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
)

func getExtension(mimeType string) (string, bool) {
	switch mimeType {
	case "image/jpeg":
		return "jpg", true
	case "image/png":
		return "png", true
	case "image/gif":
		return "gif", true
	case "image/webp":
		return "webp", true
	case "image/avif":
		return "avif", true
	default:
		// Unknown or not allowed filetype
		return "", false
	}
}

type FileCreatedResp struct {
	FileName string `json:"fileName"`
}

type MediaUploadHandler struct {
}

func (h *MediaUploadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// --- Determine the filetype
	// Alloc 512 bytes for header
	headerBuf := make([]byte, 512)
	// Read the header
	n, err := io.ReadFull(r.Body, headerBuf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		slog.Error("reading input stream for media upload failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}
	// Detect file type based on read bytes
	fileType, allowed := getExtension(http.DetectContentType(headerBuf[:n]))
	if !allowed {
		mw.SetErrorAsJSON(w, "Not supported media type", http.StatusUnsupportedMediaType)
		return
	}
	// Reconstruct already read bytes with rest of the body
	reconstructedBody := io.MultiReader(bytes.NewReader(headerBuf[:n]), r.Body)

	// --- File creation
	// Generate a random 32-char file name and form path
	randBuf := make([]byte, 16)
	n, err = rand.Read(randBuf)
	if n != 16 || err != nil {
		slog.Error("failed to generate random filename for media upload", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}
	fileName := fmt.Sprintf("%v.%v", hex.EncodeToString(randBuf), fileType)
	filePath := filepath.Join("/app/uploads", fileName)
	// Create the file
	file, err := os.Create(filePath)
	if err != nil {
		slog.Error("file creation on media upload failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	_, err = io.Copy(file, reconstructedBody)
	if err != nil {
		// Remove created file (discard error as this already is error handling)
		os.Remove(filePath)
		slog.Error("writing file on media upload failed", "error", err)
		mw.SetErrorAsJSON(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(FileCreatedResp{
		FileName: fileName,
	})
}

func NewMediaUploadHandler(authMiddleware mw.Middleware) http.Handler {
	return mw.Chain(&MediaUploadHandler{}, mw.Logging(), mw.BodyLimit(5*mw.MB), authMiddleware)
}
