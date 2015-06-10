
(function() {
var appBase = Core.Util.baseDirectory('kjing-debug.js');

Core.Util.include(appBase+'kjing/ratiobox.js');
Core.Util.include(appBase+'kjing/rounditemgraphic.js');
Core.Util.include(appBase+'kjing/resourceviewer.js');
Core.Util.include(appBase+'kjing/resourceicon.js');
Core.Util.include(appBase+'kjing/iconviewer.js');
Core.Util.include(appBase+'kjing/resourceiconviewer.js');
Core.Util.include(appBase+'kjing/field.js');
Core.Util.include(appBase+'kjing/textfield.js');
Core.Util.include(appBase+'kjing/textareafield.js');
Core.Util.include(appBase+'kjing/combofield.js');
Core.Util.include(appBase+'kjing/quotafield.js');
Core.Util.include(appBase+'kjing/optionsection.js');
Core.Util.include(appBase+'kjing/newicon.js');
Core.Util.include(appBase+'kjing/resourcenewicon.js');
Core.Util.include(appBase+'kjing/creatorselector.js');
Core.Util.include(appBase+'kjing/righticonviewer.js');
Core.Util.include(appBase+'kjing/resourcerightcreator.js');
Core.Util.include(appBase+'kjing/resourcerightnewicon.js');
Core.Util.include(appBase+'kjing/webaccountsection.js');
Core.Util.include(appBase+'kjing/resourcecreator.js');
Core.Util.include(appBase+'kjing/resourceproperties.js');
Core.Util.include(appBase+'kjing/resourcecontrollerviewer.js');
Core.Util.include(appBase+'kjing/resourcepropertiesdialog.js');
Core.Util.include(appBase+'kjing/creatordialog.js');
//Core.Util.include(appBase+'kjing/newresourcedialog.js');
//Core.Util.include(appBase+'kjing/fileviewer.js');
Core.Util.include(appBase+'kjing/mediacontroller.js');
//Core.Util.include(appBase+'kjing/fileview.js');
Core.Util.include(appBase+'kjing/message.js');
Core.Util.include(appBase+'kjing/messages.js');
Core.Util.include(appBase+'kjing/messageview.js');
Core.Util.include(appBase+'kjing/contactmessagesdialog.js');
Core.Util.include(appBase+'kjing/historymessages.js');

// include login methods
Core.Util.include(appBase+'logins/wizarditem.js');
Core.Util.include(appBase+'logins/logincreator.js');
Core.Util.include(appBase+'logins/loginwizard.js');
Core.Util.include(appBase+'logins/local/wizard.js');
Core.Util.include(appBase+'logins/google/wizard.js');
Core.Util.include(appBase+'logins/facebook/wizard.js');
Core.Util.include(appBase+'logins/create/wizard.js');

// folder
Core.Util.include(appBase+'kjing/folder/foldercreator.js');
Core.Util.include(appBase+'kjing/folder/foldericon.js');
Core.Util.include(appBase+'kjing/folder/foldericonviewer.js');
Core.Util.include(appBase+'kjing/folder/folderviewer.js');

// user
Core.Util.include(appBase+'kjing/user/uploadfacebutton.js');
Core.Util.include(appBase+'kjing/user/userproperties.js');
Core.Util.include(appBase+'kjing/user/usercreator.js');
Core.Util.include(appBase+'kjing/user/usericon.js');
Core.Util.include(appBase+'kjing/user/usericonviewer.js');
Core.Util.include(appBase+'kjing/user/userviewer.js');

// group
Core.Util.include(appBase+'kjing/group/groupcreator.js');
Core.Util.include(appBase+'kjing/group/groupmembercreator.js');
Core.Util.include(appBase+'kjing/group/groupmembernewicon.js');
Core.Util.include(appBase+'kjing/group/groupviewer.js');
Core.Util.include(appBase+'kjing/group/groupicon.js');
Core.Util.include(appBase+'kjing/group/groupiconviewer.js');

// device
Core.Util.include(appBase+'kjing/device/deviceproperties.js');
Core.Util.include(appBase+'kjing/device/deviceviewer.js');
Core.Util.include(appBase+'kjing/device/deviceicon.js');
Core.Util.include(appBase+'kjing/device/deviceiconviewer.js');

// map
Core.Util.include(appBase+'kjing/map/mapproperties.js');
Core.Util.include(appBase+'kjing/map/mapmembercreator.js');
Core.Util.include(appBase+'kjing/map/mapdevicecreator.js');
Core.Util.include(appBase+'kjing/map/mapcreator.js');
Core.Util.include(appBase+'kjing/map/mapicon.js');
Core.Util.include(appBase+'kjing/map/mapmembernewicon.js');
Core.Util.include(appBase+'kjing/map/mapviewer.js');
Core.Util.include(appBase+'kjing/map/mapdevicesviewer.js');

// file
Core.Util.include(appBase+'kjing/file/filecreator.js');
Core.Util.include(appBase+'kjing/file/fileproperties.js');
Core.Util.include(appBase+'kjing/file/fileviewer.js');
Core.Util.include(appBase+'kjing/file/fileicon.js');
Core.Util.include(appBase+'kjing/file/fileiconviewer.js');

// text
Core.Util.include(appBase+'kjing/text/textcreator.js');
Core.Util.include(appBase+'kjing/text/textviewer.js');
Core.Util.include(appBase+'kjing/text/texteditor.js');
Core.Util.include(appBase+'kjing/text/textcontrollerviewer.js');

// image
Core.Util.include(appBase+'kjing/image/imageproperties.js');
Core.Util.include(appBase+'kjing/image/imageviewer.js');
Core.Util.include(appBase+'kjing/image/imagecontrollerviewer.js');

// video
Core.Util.include(appBase+'kjing/video/videoproperties.js');
Core.Util.include(appBase+'kjing/video/videoviewer.js');
Core.Util.include(appBase+'kjing/video/videocontrollerviewer.js');

// audio
Core.Util.include(appBase+'kjing/audio/audioproperties.js');
Core.Util.include(appBase+'kjing/audio/audioviewer.js');
Core.Util.include(appBase+'kjing/audio/audiocontrollerviewer.js');

// pdf
Core.Util.include(appBase+'kjing/pdf/pdfproperties.js');
Core.Util.include(appBase+'kjing/pdf/pdfviewer.js');
Core.Util.include(appBase+'kjing/pdf/pdfcontrollerviewer.js');

// site
Core.Util.include(appBase+'kjing/site/sitecreator.js');
Core.Util.include(appBase+'kjing/site/siteproperties.js');
Core.Util.include(appBase+'kjing/site/siteviewer.js');
Core.Util.include(appBase+'kjing/site/sitecontrollerviewer.js');

// link
Core.Util.include(appBase+'kjing/link/linkviewer.js');
Core.Util.include(appBase+'kjing/link/linkicon.js');
Core.Util.include(appBase+'kjing/link/linkiconviewer.js');

// search request
Core.Util.include(appBase+'kjing/search/searchviewer.js');

// state
Core.Util.include(appBase+'kjing/state/statecreator.js');
Core.Util.include(appBase+'kjing/state/stateviewer.js');

// main app
Core.Util.include(appBase+'main.js');

})();
