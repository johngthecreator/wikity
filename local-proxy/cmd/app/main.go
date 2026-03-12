package main

import (
	"context"
	"github.com/johngthecreator/wikity/internal/gui/tray"
	server "github.com/johngthecreator/wikity/internal/http"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go server.NewHttpServer(":8080", ctx)
	tray.Run(ctx, cancel)

}
