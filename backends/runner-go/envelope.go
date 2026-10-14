package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"runtime"
	"strings"
	"time"

	coffeemail "github.com/Coffee-Mail/coffee-mail-sdk-go"
)

const (
	languageGo             = "go"
	runtimePrefix          = "Go "
	goVersionPrefix        = "go"
	statusOnline           = "online"
	codeValidation         = "VALIDATION_ERROR"
	codeExecution          = "RUNNER_EXECUTION_ERROR"
	executionErrorCode     = http.StatusInternalServerError
	unauthenticatedMessage = "Chave de API não informada. Defina a API Key no cabeçalho do Workbench para executar operações no SDK."
	contentTypeHeader      = "Content-Type"
	jsonContentType        = "application/json"
)

type runnerInfo struct {
	Language   string `json:"language"`
	Runtime    string `json:"runtime"`
	SDKVersion string `json:"sdkVersion"`
	Status     string `json:"status"`
}

type runnerError struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Status  int            `json:"status"`
	Details map[string]any `json:"details"`
}

type standardResponse struct {
	Success         bool         `json:"success"`
	Runner          runnerInfo   `json:"runner"`
	ExecutionTimeMs int64        `json:"executionTimeMs"`
	Data            any          `json:"data"`
	Error           *runnerError `json:"error"`
}

func info() runnerInfo {
	return runnerInfo{
		Language:   languageGo,
		Runtime:    runtimePrefix + strings.TrimPrefix(runtime.Version(), goVersionPrefix),
		SDKVersion: coffeemail.Version,
		Status:     statusOnline,
	}
}

func success(data any, start time.Time) standardResponse {
	return standardResponse{Success: true, Runner: info(), ExecutionTimeMs: time.Since(start).Milliseconds(), Data: data}
}

func failure(code, message string, status int, start time.Time) standardResponse {
	return standardResponse{
		Runner:          info(),
		ExecutionTimeMs: time.Since(start).Milliseconds(),
		Error:           &runnerError{Code: code, Message: message, Status: status},
	}
}

func executionFailure(err error, start time.Time) standardResponse {
	return failure(codeExecution, sdkMessage(err), executionErrorCode, start)
}

func sdkMessage(err error) string {
	var apiErr *coffeemail.Error
	if errors.As(err, &apiErr) && apiErr.Message != "" {
		return apiErr.Message
	}
	return err.Error()
}

func respond(w http.ResponseWriter, status int, body standardResponse) {
	w.Header().Set(contentTypeHeader, jsonContentType)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
