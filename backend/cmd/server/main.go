// Command server runs the portfolio content API. It is designed to listen on
// localhost behind Nginx; the admin token never appears in logs.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"portfolio/internal/api"
	"portfolio/internal/content"
)

func main() {
	addr := env("PORTFOLIO_ADDR", "127.0.0.1:8080")
	dbPath := env("PORTFOLIO_DB", "data/portfolio.db")
	token := os.Getenv("PORTFOLIO_ADMIN_TOKEN")

	store, err := content.Open(context.Background(), dbPath)
	if err != nil {
		log.Fatalf("open content store: %v", err)
	}
	defer store.Close()

	server := api.New(store, api.Config{
		AdminToken:            token,
		RateLimit:             120,
		ContactRateLimit:      5,
		ContactAllowedOrigins: envList("PORTFOLIO_CONTACT_ORIGINS"),
	})
	httpServer := &http.Server{
		Addr:              addr,
		Handler:           server.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       20 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("content API listening on http://%s (database %s)", addr, dbPath)
		if token == "" {
			log.Print("PORTFOLIO_ADMIN_TOKEN is empty: admin write endpoints are disabled")
		}
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("serve: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	log.Print("content API stopped")
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// envList reads a comma-separated allowlist from the environment.
func envList(key string) []string {
	var values []string
	for _, value := range strings.Split(os.Getenv(key), ",") {
		if value = strings.TrimSpace(value); value != "" {
			values = append(values, value)
		}
	}
	return values
}
