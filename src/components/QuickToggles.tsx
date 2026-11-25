import { Icon } from "./Icon";
import { useSettings } from "../lib/settings";

export function QuickToggles() {
  const { settings, update, resolvedTheme } = useSettings();
  return (
    <div className="quick-toggles">
      <button
        className="icon-btn"
        onClick={() => update({ sound: !settings.sound })}
        aria-label={settings.sound ? "Mute sounds" : "Turn sounds on"}
        title={settings.sound ? "Sound on" : "Sound off"}
      >
        <Icon name={settings.sound ? "soundOn" : "soundOff"} />
      </button>
      <button
        className="icon-btn"
        onClick={() => update({ theme: resolvedTheme === "dark" ? "light" : "dark" })}
        aria-label="Toggle light and dark theme"
        title="Toggle theme"
      >
        <Icon name={resolvedTheme === "dark" ? "sun" : "moon"} />
      </button>
    </div>
  );
}
