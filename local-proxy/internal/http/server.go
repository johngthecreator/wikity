package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
)

func getUrl(w http.ResponseWriter, r *http.Request) {
	targetUrl := r.URL.Query().Get("url")
	if targetUrl == "" {
		http.Error(w, "Service unavailable: No url provided", http.StatusServiceUnavailable)
		return
	}

	res, err := http.Get(targetUrl)

	if err != nil {
		json, _ := json.Marshal(err)
		http.Error(w, string(json), http.StatusServiceUnavailable)
	}

	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)

	var data map[string]any

	// this is how to destructure and access json
	json.Unmarshal(body, &data)

	enc := json.NewEncoder(w)
	w.Header().Set("Content-Type", "application/json")
	enc.Encode(data)
}

func NewHttpServer(port string, ctx context.Context) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/get", getUrl)
	server := &http.Server{
		Addr:    port,
		Handler: mux,
	}

	go server.ListenAndServe()
	println("🚀 Server started on http://localhost:8080")

	// implicit for and select
	<-ctx.Done()

	server.Shutdown(ctx)

}
