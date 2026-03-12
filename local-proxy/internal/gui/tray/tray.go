package tray

import (
	"context"
	"fmt"

	"github.com/getlantern/systray"
	"github.com/getlantern/systray/example/icon"
	"github.com/skratchdot/open-golang/open"
)

func onReady(ctx context.Context, cancel context.CancelFunc) {
	systray.SetTemplateIcon(icon.Data, icon.Data)
	systray.SetTooltip("Wikity")

	// We can manipulate the systray in other goroutines
	go func() {
		// systray.SetTemplateIcon(icon.Data, icon.Data)
		// systray.SetTooltip("Pretty awesome棒棒嗒")
		mStatus := systray.AddMenuItem("Status: Running", "App status")
		mStatus.Disable()

		mPort := systray.AddMenuItem("Port: 8080", "Localhost Port")
		mPort.Disable()

		mUrl := systray.AddMenuItem("Open Web UI", "Open Web UI")

		systray.AddSeparator()
		mQuitOrig := systray.AddMenuItem("Quit", "Quit Wikity")

		for {
			select {
			case <-mUrl.ClickedCh:
				open.Run("http://localhost:8080")
			case <-mQuitOrig.ClickedCh:
				cancel()
				systray.Quit()
			case <-ctx.Done():
				systray.Quit()
			}
		}
	}()
}

func Run(ctx context.Context, cancel context.CancelFunc) {
	systray.Run(func() { onReady(ctx, cancel) }, func() { fmt.Println("Closing...") })
}
