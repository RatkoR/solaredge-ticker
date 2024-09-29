import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
const { Soup } = imports.gi;

export default class SolaredgeExtension extends Extension {
    enable() {
        console.log('SE: init');

        this._timeoutId = 0;
        this._noonce = 0;
        this._soupSession = new Soup.Session();
        this._mbmdData = null;

        console.log('SE: init done');

        // Create a panel button
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        // Create a horizontal box layout to hold both the icon and the text
        this._box = new St.BoxLayout({ vertical: false });

        // Create an icon
        const giconExport = Gio.icon_new_for_string(this.path + '/assets/sun.svg');
        this._iconSolar = new St.Icon({
            gicon: giconExport,
            style_class: 'system-status-icon icon-export'
        });

        // Create the label (text) that will appear next to the icon
        this._labelSolar = new St.Label({
            text: '----',
            style_class: 'text-export state-initial',
            y_align: Clutter.ActorAlign.CENTER,
        });

        const giconGrid = Gio.icon_new_for_string(this.path + '/assets/grid.svg');
        this._iconGrid = new St.Icon({
            gicon: giconGrid,
            style_class: 'system-status-icon icon-import'
        });

        this._labelGrid = new St.Label({
            text: '----',
            style_class: 'text-import state-initial',
            y_align: Clutter.ActorAlign.CENTER,
        });
        
        // Add the icon and the label to the horizontal box layout
        this._box.add_child(this._iconSolar);
        this._box.add_child(this._labelSolar);
        this._box.add_child(this._iconGrid);
        this._box.add_child(this._labelGrid);

        // Add the box layout to the indicator (or wherever you're adding it)
        this._indicator.add_child(this._box);

        // Add the indicator to the panel
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        try {
            this._settings = this.getSettings();
        } catch (e) {
            console.log("SE: ", e);
        }

        // Add a menu item to open the preferences window
        this._indicator.menu.addAction(_('Details'), () => this.showDetails());
        this._indicator.menu.addAction(_('Preferences'), () => { this.openPreferences(); });

        this._settings = this.getSettings();

        this._tick();
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
        this._soupSesston = null;

        this.clearTimer();
    }

    // Event handler for the "Show Details" menu item
    showDetails() {
        console.log('SE: show details!');

        const mbmdUrl = this.getSetting('mbmd-url');
        const detailsUrl = mbmdUrl + '/details';

        GLib.spawn_command_line_async('firefox ' + detailsUrl);
    }

    getSettingInt(key, defaultValue) {
        const val = this._settings.get_string(key);
        const valInt = parseInt(val, 10);

        if (isNaN(valInt) || valInt <= 0) {
            return defaultValue;
        }

        return valInt;
    }

    getSetting(key) {
        return this._settings.get_string(key);
    }

    clearTimer() {
        console.log('SE: clear timer', this._timeoutId);

        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
    }

    startTimer() {
        const delay = this.getSettingInt('mbm-request-delay', 10);
        console.log('SE: start timer with delay (sec) ', delay);

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay * 1000, () => {
            this._tick();
            return GLib.SOURCE_REMOVE;
        });
    }

    async _tick() {
        console.log('SE: start _tick');

        this.clearTimer();

        this.updateValues();

        this.startTimer();
    }

    async updateValues() {
        const success = await this.fetchNewData();

        if (!success) {
            console.log('No new data received');
            return;
        }

        this.draw();
    }

    async fetchNewData() {
        this._noonce++;
        console.log('SE: fetch new data');

        const mbmdUrl = this.getSetting('mbmd-url');
        const dataUrl = mbmdUrl + '/api/last';

        let data = null;

        try {
            const json = await this.fetchJSON(dataUrl);
            data = JSON.parse(json);
        } catch (e) {
            console.log('SE: err: ', e);
            return false;
        }

        // Check that we get correct data and that we can parse it
        const solaredgeKey = this.getSetting('mbm-solaredge-key');
        const powermeterKey = this.getSetting('mbm-powermeter-key');

        if (!(solaredgeKey in data)) {
            console.log('SE: No ', solaredgeKey, ' key in data payload');
            return false;
        }

        if (!(powermeterKey in data)) {
            console.log('SE: No ', powermeterKey, ' key in data payload');
            return false;
        }

        this._mbmdData = data;

        console.log('SE: data ', this._mbmdData)

        return true;
    }

    mbmdValue(base, key) {
        return this._mbmdData[base][key];
    }

    toKW(val) {
        val = Math.floor(val / 10) / 100;
        return val + ' kW';
    }

    // Helper function to convert a hex color string (#RRGGBB) to an RGB object
    hexToRgb(hex) {
        // Remove the leading '#' if present
        hex = hex.replace(/^#/, '');

        // Parse the RGB values from the hex string
        const bigint = parseInt(hex, 16);
        return {
            red: (bigint >> 16) & 255,
            green: (bigint >> 8) & 255,
            blue: bigint & 255,
        };
    }

    // Helper function to convert RGB values to a hex string
    rgbToHex(red, green, blue) {
        const redHex = red.toString(16).padStart(2, '0').toUpperCase();
        const greenHex = green.toString(16).padStart(2, '0').toUpperCase();
        const blueHex = blue.toString(16).padStart(2, '0').toUpperCase();
        return `#${redHex}${greenHex}${blueHex}`;
    }

    powerToColor(value, min, minColor, max, maxColor) {
        value = parseInt(value, 10);

        // Ensure the value is clamped between min and max
        if (value < min) value = min;
        if (value > max) value = max;
    
        // Convert hex colors to RGB components
        const minRGB = this.hexToRgb(minColor);
        const maxRGB = this.hexToRgb(maxColor);
    
        // Calculate the interpolation ratio
        const ratio = (value - min) / (max - min);
    
        // Interpolate between the two colors
        const red = Math.round(minRGB.red + (maxRGB.red - minRGB.red) * ratio);
        const green = Math.round(minRGB.green + (maxRGB.green - minRGB.green) * ratio);
        const blue = Math.round(minRGB.blue + (maxRGB.blue - minRGB.blue) * ratio);
    
        // Convert the interpolated RGB values back to a hex string
        return this.rgbToHex(red, green, blue);
    }

    draw() {
        console.log('SE: draw');
        
        this._labelSolar.remove_style_class_name('state-initial');
        this._labelGrid.remove_style_class_name('state-initial');

        const solaredgeKey = this.getSetting('mbm-solaredge-key');
        const powermeterKey = this.getSetting('mbm-powermeter-key');

        const solarPower = this.mbmdValue(solaredgeKey, 'Power');
        const maxSolarPower = this.getSettingInt('mbm-max-solar-power', 11000);
        const minSolarPower = 0;
        const minSolarColor = '#FFD700';
        const maxSolarColor = '#LimeGreen';
        const solarColor = this.powerToColor(solarPower, minSolarPower, minSolarColor, maxSolarPower, maxSolarColor);

        const minGridPower = 0;
        const gridPower = this.mbmdValue(powermeterKey, 'Power');
        let maxGridPower = this.getSettingInt('mbm-max-grid-power', 12000)
        let gridColor = '';

        if (gridPower < 0) {
            const minGridColor = '#00BFFF';
            const maxGridColor = '#FF0000';
            gridColor = this.powerToColor(-1 * gridPower, minGridPower, minGridColor, maxGridPower, maxGridColor);
        } else {
            const minGridColor = '#00BFFF';
            const maxGridColor = '#00FF00';
            maxGridPower = maxSolarPower
            gridColor = this.powerToColor(gridPower, minGridPower, minGridColor, maxGridPower, maxGridColor);
        }

        console.log('SE: Powers', solarPower, gridPower);
        console.log('SE: kW', this.toKW(solarPower), this.toKW(gridPower));
        console.log('SE: Max', maxSolarPower, maxGridPower);
        console.log('SE: Colors', solarColor, gridColor);

        this._labelSolar.text = this.toKW(solarPower);
        this._labelGrid.text = this.toKW(gridPower);

        this._labelSolar.set_style('color:' + solarColor);
        this._labelGrid.set_style('color:' + gridColor);
    }

    async fetchJSON(url) {
        const message = Soup.Message.new('GET', url);
        message.request_headers.append('User-Agent', 'SolaredgeTicker/3.0');

        console.log('SE: url ', url, Soup.get_major_version());
        
        return new Promise((resolve, reject) => {
            this._soupSession.send_and_read_async(message, 1, null).then((bytes) => {
                const statusCode = message.status_code;
                console.log('SE: status ', statusCode);

                if (statusCode === 200) {
                    // Successful response (HTTP 200)
                    if (bytes) {
                        const string = new TextDecoder().decode(bytes.toArray());
                        resolve(string);
                    } else {
                        reject(new Error('SI: Empty response'));
                    }
                } else if (statusCode === 404) {
                    // Handle 404 Not Found
                    reject(new Error('Error 404: Not Found'));
                } else if (statusCode === 500) {
                    // Handle 500 Internal Server Error
                    reject(new Error('Error 500: Internal Server Error'));
                } else {
                    // Handle other non-successful status codes
                    reject(new Error(`Request failed with status code ${statusCode}`));
                }
            }).catch(error => {
                console.debug(error);
                reject(new Error('SI: Request failed'));
            });
        });
    }
}