Ui.App.extend("KJing.RoomApp",{scroll:void 0,constructor:function(a){a=new Ui.VBox({margin:20});this.setContent(a);a.append(new Ui.Text({text:"Liste des salles de m\u00e9diation publiques",fontWeight:"bold",fontSize:20}));a.append(new Ui.Text({text:"choisissez une salle pour rejoindre la m\u00e9diation en cours",fontSize:16}));this.scroll=new Ui.ScrollingArea({marginTop:10});a.append(this.scroll,!0);a=new Ui.VBox({spacing:10});this.scroll.setContent(a);for(var b=0;20>b;b++){var c=new Ui.Button({text:"Salle "+
b});a.append(c)}}});
new KJing.RoomApp({webApp:!0,style:{"Ui.Element":{color:"#444444",fontSize:16,interLine:1.4},"Ui.MenuPopup":{background:"#ffffff","Ui.Button":{background:new Ui.Color({r:1,g:1,b:1,a:0.1}),backgroundBorder:new Ui.Color({r:1,g:1,b:1,a:0.1}),iconSize:28,textHeight:28},"Ui.DefaultButton":{borderWidth:1,background:"#fefefe",backgroundBorder:"black",iconSize:16,textHeight:16},"Ui.ActionButton":{showText:!1},"Ui.SegmentBar":{spacing:7,color:"#ffffff"}},"Ui.SegmentBar":{spacing:8,color:"#ffffff"},"Ui.Dialog":{background:"#ffffff"},
"Ui.DialogTitle":{fontSize:20,maxLine:2,interLine:1},"Ui.DialogCloseButton":{background:"rgba(250,250,250,0)",radius:0,borderWidth:0},"Ui.ContextBarCloseButton":{textWidth:5,borderWidth:0,background:"rgba(250,250,250,0)",foreground:"#ffffff",radius:0},"Ui.Separator":{color:"#999999"},"Ui.CheckBox":{color:"#444444",focusColor:new Ui.Color({r:0.13,g:0.83,b:1}),checkColor:new Ui.Color({r:0.03,g:0.63,b:0.9})},"Ui.ScrollingArea":{color:"#999999",showScrollbar:!1,overScroll:!0,radius:0},"Ui.Button":{background:"#fefefe",
iconSize:28,textHeight:28,padding:8,spacing:10,focusBackground:new Ui.Color({r:0.13,g:0.83,b:1,a:0.5})},"Ui.TextBgGraphic":{focusBackground:new Ui.Color({r:0.13,g:0.83,b:1})},"Ui.ActionButton":{iconSize:28,textHeight:28,background:new Ui.Color({r:1,g:1,b:1,a:0}),backgroundBorder:new Ui.Color({r:1,g:1,b:1,a:0}),foreground:"#ffffff",radius:0,borderWidth:0},"Ui.Slider":{foreground:new Ui.Color({r:0.03,g:0.63,b:0.9})},"Ui.Locator":{color:"#eeeeee",iconSize:30,spacing:6},"Ui.MenuToolBarButton":{color:new Ui.Color({r:0.8,
g:0.8,b:0.8,a:0.2}),iconSize:28,spacing:0},"Ui.ContextBar":{background:"#00b9f1","Ui.Element":{color:"#ffffff"}},"KJing.PosBar":{radius:0,current:new Ui.Color({r:0.03,g:0.63,b:0.9})},"KJing.OptionOpenButton":{borderWidth:0,iconSize:16,radius:0,whiteSpace:"pre-line",background:"rgba(250,250,250,0)"},"KJing.ItemView":{orientation:"vertical",whiteSpace:"pre-line",textWidth:100,maxTextWidth:100,fontSize:16,interLine:1,textHeight:32,iconSize:64,maxLine:2,background:new Ui.Color({r:1,g:1,b:1,a:0}),backgroundBorder:new Ui.Color({r:1,
g:1,b:1,a:0}),focusBackground:new Ui.Color({r:1,g:1,b:1,a:0}),focusBackgroundBorder:new Ui.Color({r:0,g:0.72,b:0.95}),selectCheckColor:new Ui.Color({r:0,g:0.72,b:0.95}),radius:0,borderWidth:2},"KJing.GroupUserItemView":{roundMode:!0},"KJing.GroupAddUserItemView":{roundMode:!0},"KJing.RightAddGroupItemView":{roundMode:!0},"KJing.RightAddUserItemView":{roundMode:!0},"KJing.RightItemView":{roundMode:!0},"KJing.MenuToolBar":{background:"#6c19ab","Ui.Button":{background:new Ui.Color({r:1,g:1,b:1,a:0.2}),
backgroundBorder:new Ui.Color({r:1,g:1,b:1,a:0.3}),foreground:"#ffffff",focusBackground:new Ui.Color({r:0.43,g:1,b:1,a:0.6}),focusForeground:"#ffffff"},"Ui.TextBgGraphic":{background:"#ffffff",focusBackground:new Ui.Color({r:0.43,g:1,b:1,a:0.6})},"Ui.Entry":{color:"#ffffff"}},"KJing.NewItem":{background:new Ui.Color({r:1,g:1,b:1,a:0}),backgroundBorder:new Ui.Color({r:1,g:1,b:1,a:0}),focusBackground:new Ui.Color({r:1,g:1,b:1,a:0}),focusBackgroundBorder:new Ui.Color({r:0,g:0.72,b:0.95}),iconSize:48,
padding:31,radius:0,borderWidth:2},"KJing.UserProfilButton":{iconSize:32}}});