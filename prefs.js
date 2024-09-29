import Gio from 'gi://Gio';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class SolaredgePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Basic settings'),
            description: _(''),
        });
        page.add(group);

        // Create a preferences row for mbmd url
        const rowMbmdUrl = new Adw.EntryRow({
            title: _('URL'),
        });
        group.add(rowMbmdUrl);

        // Create a preferences row for solaredge json key
        const rowMbmdSolaredgeKey = new Adw.EntryRow({
            title: _('Solaredge key'),
        });
        group.add(rowMbmdSolaredgeKey);

        // Create a preferences row for powermeter json key
        const rowMbmdPowermeterKey = new Adw.EntryRow({
            title: _('Powermeter key'),
        });
        group.add(rowMbmdPowermeterKey);
        
        // Create a preferences row for powermeter json key
        const rowMaxSolarPower = new Adw.EntryRow({
            title: _('How much solar power is generated at maximum (in W).'),
        });
        group.add(rowMaxSolarPower);

        // Create a preferences row for powermeter json key
        const rowMaxGridPower = new Adw.EntryRow({
            title: _('What is grid maximum usage, before you pay penalties (in W).'),
        });
        group.add(rowMaxGridPower);

        // Create a preferences row for powermeter json key
        const rowMbmdRequestDelay = new Adw.EntryRow({
            title: _('Delay in seconds between requests to mbmd api'),
        });
        group.add(rowMbmdRequestDelay);

        // Create a settings object and bind the row to the GSettings key
        window._settings = this.getSettings();

        // Bind properties
        window._settings.bind('mbmd-url', rowMbmdUrl, 'text', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('mbm-solaredge-key', rowMbmdSolaredgeKey, 'text', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('mbm-powermeter-key', rowMbmdPowermeterKey, 'text', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('mbm-request-delay', rowMbmdRequestDelay, 'text', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('mbm-max-solar-power', rowMaxSolarPower, 'text', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('mbm-max-grid-power', rowMaxGridPower, 'text', Gio.SettingsBindFlags.DEFAULT);
    }
}