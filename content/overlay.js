/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Thunderbird Experimental Message View.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://gloda/modules/log4moz.js");
Components.utils.import("resource://gloda/modules/gloda.js");
Components.utils.import("resource://gloda/modules/indexer.js");
Components.utils.import("resource://gloda/modules/utils.js");

Components.utils.import("resource://expmess/modules/EMTreeView.js");
Components.utils.import("resource://expmess/modules/EMVis.js");

var expmess = {
  constraintMessageTree: null,
  jsConstraintMessageTreeView: null,
  
  indexingStatusLabel: null,
  progressFolders: null,
  progressMessages: null,
  progressListener: null,
  
  constraintCanvas: null,
  visConstraint: null,
  
  // list of: [attrib, parameter, value (and a second value if it's a range)]
  constraintsAPV: [],
  
  authorImage: null,
  authorName: null,
  authorEmail: null,
  
  factBox: null,
  
  log: Log4Moz.Service.getLogger("expmess.overlay"),

  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "MsgMsgDisplayed" ) {
      // get out of the synchronous path where we interfere with the preview
      //  window.
      window.setTimeout(this._bounce, 300, this.onMessageDisplayed);
    }
  },
  
  _bounce: function(aMethod) {
    aMethod.call(expmess);
  },
  
  onMessageDisplayed: function() {
    var msgHdr = gDBView.hdrForFirstSelectedMessage;
    try {
      if (msgHdr != null) {
        var selectedMessage = Gloda.getMessageForHeader(msgHdr);
        
        var attrFrom = Gloda.getAttrDef(Gloda.BUILT_IN, "from");
        this.constraintsAPV = selectedMessage.getSingleAttribute(attrFrom);
        
        // so, the e-mail address really shouldn't be all unicode-y, but this
        //  at the very least converts the string to a byte array.
        var md5hash = GlodaUtils.md5HashString(selectedMessage.from.value);
        var gravURL = "http://www.gravatar.com/avatar/" + md5hash + 
                                "?d=identicon&s=80&r=g";
        this.authorImage.src = gravURL;
        var authorCard = selectedMessage.from.abCard;
        if (authorCard) {
          this.authorName.value = (authorCard.displayName ||
                                        authorCard.nickName);
        } else
          this.authorName.value = selectedMessage.from.contact.name;
        this.authorEmail.value = selectedMessage.from.value;
        
        this.updateFacts(selectedMessage);
        this.updateConstraints();
      }
    } catch (ex) {
      this.log.info("Exception at " + ex.fileName + ":" + ex.lineNumber + ":" +
                    ex);
      this.authorImage.src = null;
      this.authorName.value = ":(";
      this.authorEmail.value = "";
      this.jsConstraintMessageTreeView.messages = [];
      this.visConstraint.messages = [];
      this.visConstraint.selectedMessage = null;
    } 
  },
  
  updateConstraints: function updateConstraints() {
    var elements = document.getElementsByClassName("magic-constraint");
    var constraints = [];
    for (var iElem=0; iElem < elements.length; iElem++) {
      var elem = elements[iElem];
      var attr = elem.actionData[0];
      var action = elem.actionData[1];
      var value = elem.actionData[2];
      
      if (elem.checked)
        constraints.push(action.makeConstraint(attr, value));
    }
    
    this.constraintsAPV = constraints;
  
    this.log.debug("constraints: " + this.constraintsAPV);
  
    var messages = Gloda.queryMessagesAPV(this.constraintsAPV);

    this.log.debug("  returned " + messages.length + " messages");

    this.jsConstraintMessageTreeView.messages = messages;

    this.visConstraint.messages = messages;
    this.visConstraint.selectedMessage = null;
  },

  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("expmess-strings");
    
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
                          getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "MsgMsgDisplayed", false);                           
    
    this.constraintMessageTree = document.getElementById("constraintMessageTree");
    this.jsConstraintMessageTreeView = new EMTreeView(null);
    this.constraintMessageTree.view = this.jsConstraintMessageTreeView;
    
    this.constraintCanvas = document.getElementById("constraintCanvas");
    this.visConstraint = new EMVis(this.constraintCanvas, null);
    this.visConstraint.render();
    
    this.authorImage = document.getElementById("authorPicture");
    this.authorName = document.getElementById("authorName");
    this.authorEmail = document.getElementById("authorEmail");
    
    this.indexingStatusLabel = document.getElementById("mineStatusLabel");
    this.progressFolders = document.getElementById("mineFolderProgress");
    this.progressMessages = document.getElementById("mineMessageProgress");
    
    this.factBox = document.getElementById("factBox");
    
    this.progressListener = GlodaIndexer.addListener(
      function(status,fn, cf, tf, cm, tm) {
        expmess.onIndexProgress(status, fn,cf,tf,cm,tm);
      });
  },
  
  onUnload: function() {
    if (this.progressListener) {
      GlodaIndexer.removeListener(this.progressListener);
      this.progressListener = null;
    }
  },

  onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                this.strings.getString("helloMessage"));
  },

  onComposeToClicked: function() {
    try {
      var fields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
      var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
      fields.to = this.authorEmail.value;
      this.log.debug("  authorEmail: " + this.authorEmail.value);
      params.type = Components.interfaces.nsIMsgCompType.New;
      params.format = Components.interfaces.nsIMsgCompFormat.Default;
      params.identity = accountManager.getFirstIdentityForServer(GetLoadedMsgFolder().server);
      params.composeFields = fields;
      msgComposeService.OpenComposeWindowWithParams(null, params);
    } catch(ex) {
      this.log.info("Exception:" + ex);
    }
  },

  onIndexProgress: function(aStatus, aFolderName,
                            aCurFolderIndex, aTotalFolders,
                            aCurMessageIndex, aTotalMessages) {
    this.indexingStatusLabel.value = aStatus;
    this.progressFolders.value = Math.floor(aCurFolderIndex / aTotalFolders * 
                                            100);
    this.progressMessages.value = Math.floor(aCurMessageIndex / aTotalMessages *
                                             100);
  },  

  onClicked: function(tree, view, event) {
    if (event.detail == 2 && event.button == 0) {
      var tbo = tree.treeBoxObject;
      var row = {}, col = {}, child = {};
      tbo.getCellAt(event.clientX, event.clientY, row, col, child);
      
      // if they didn't click on something, let's not do anything...
      if (row.value < 0)
        return false;
      
      this.log.debug("double-clicked: " + row.value + ", " + col.value + ", " + child.value);
      var message = view.messages[row.value];
      this.log.debug("  subject: " + message.conversation.subject);
      var msgHdr = message.folderMessage;
      msgWindow.windowCommands.selectFolder(msgHdr.folder.URI);
      msgWindow.windowCommands.selectMessage(msgHdr.folder.getUriForMsg(msgHdr));
       
      return true;
    }
    return false;
  },
  
  onSelected: function(tree, view, vis) {
    if (tree.currentIndex >= 0) {
      vis.selectedMessage = view.messages[tree.currentIndex];
    }
  },
  
  updateFacts: function(aMessage) {
    var factBox = this.factBox;
    var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    
    while (factBox.hasChildNodes()) {
      factBox.removeChild(factBox.firstChild);
    }
    
    var attributes = aMessage.attributes;
    attributes.sort(function (a, b) {return a[0].id - b[0].id; });
    for (var iAttrib=0; iAttrib < attributes.length; iAttrib++) {
      var attribDef = attributes[iAttrib][0];
      var value = attributes[iAttrib][1];
      
      // yes, yes, XBL.
      var factItem = document.createElementNS(XUL_NS, "richlistitem");
      var factVBox = document.createElementNS(XUL_NS, "vbox");
      var factActionBox = document.createElementNS(XUL_NS, "hbox");
      var desc = document.createElementNS(XUL_NS, "description");
      
      var explanation = attribDef.explain(null, value);
      desc.setAttribute("value", explanation);
      var factActions = Gloda.getNounActions(attribDef.objectNoun, "filter");
      for (var iAction=0; iAction < factActions.length; iAction++) {
        var action = factActions[iAction];
        var button = document.createElementNS(XUL_NS, "checkbox");
        button.setAttribute("label", action.shortName);
        button.className = "magic-constraint";
        button.actionData = [attribDef, action, value];
        // set it checked if it's "from" (attribute) "from" (action)
        if ((attribDef.attributeName == "from") &&
            (action.shortName == "from")) {
          button.setAttribute("checked", true); 
          this.log.debug("Found from from constraint! " + button.checked);
        }
        factActionBox.appendChild(button);
      }

      factVBox.appendChild(desc);
      factVBox.appendChild(factActionBox);
      factItem.appendChild(factVBox);
      factBox.appendChild(factItem);
    }
  },
  
  onFactClicked: function(event) {
    if (event.target && event.target.actionData) {
      // if alt was held down, make this the only selected thing...
      if (event.ctrlKey) {
        var elements = document.getElementsByClassName("magic-constraint");
        var constraints = [];
        for (var iElem=0; iElem < elements.length; iElem++) {
          var elem = elements[iElem];
          if (elem !== event.target)
            elem.setAttribute("checked", false);
        }
      }

      this.updateConstraints();
    }
  },
  
  onFactSelected: function(event) {
  },
  
  onGoIndex: function() {
    GlodaIndexer.indexEverything();
  },
};
window.addEventListener("load", function(e) { expmess.onLoad(e); }, false);
window.addEventListener("unload", function(e) { expmess.onUnload(e); }, false);

