
(function() {
var appBase = Core.Util.baseDirectory('kjing-debug.js');

Core.Util.include(appBase+'kjing/filecontrol.js');
Core.Util.include(appBase+'kjing/ratiobox.js');
Core.Util.include(appBase+'kjing/rounditemgraphic.js');
Core.Util.include(appBase+'kjing/view.js');
Core.Util.include(appBase+'kjing/itemview.js');
Core.Util.include(appBase+'kjing/textfield.js');
Core.Util.include(appBase+'kjing/textareafield.js');
Core.Util.include(appBase+'kjing/combofield.js');
Core.Util.include(appBase+'kjing/optionsection.js');
Core.Util.include(appBase+'kjing/newitem.js');
Core.Util.include(appBase+'kjing/newfiledialog.js');
Core.Util.include(appBase+'kjing/filepropertiesdialog.js');
Core.Util.include(appBase+'kjing/filepreview.js');
Core.Util.include(appBase+'kjing/webaccountsection.js');
Core.Util.include(appBase+'kjing/userprofil.js');
Core.Util.include(appBase+'kjing/resourcepropertiesdialog.js');
Core.Util.include(appBase+'kjing/newresourcedialog.js');
Core.Util.include(appBase+'kjing/fileviewer.js');
Core.Util.include(appBase+'kjing/deviceitemview.js');
Core.Util.include(appBase+'kjing/deviceview.js');
Core.Util.include(appBase+'kjing/mapdevicesview.js');
Core.Util.include(appBase+'kjing/linkview.js');

// include login methods
Core.Util.include(appBase+'logins/wizarditem.js');
Core.Util.include(appBase+'logins/logincreator.js');
Core.Util.include(appBase+'logins/loginwizard.js');
Core.Util.include(appBase+'logins/local/wizard.js');
Core.Util.include(appBase+'logins/google/wizard.js');
Core.Util.include(appBase+'logins/facebook/wizard.js');
Core.Util.include(appBase+'logins/create/wizard.js');

// main app
Core.Util.include(appBase+'main.js');

})();
