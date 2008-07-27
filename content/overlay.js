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
  threadMessageTree: null,
  jsThreadMessageTreeView: null,
  
  indexingStatusLabel: null,
  progressFolders: null,
  progressMessages: null,
  progressListener: null,
  
  authorCanvas: null,
  visAuthor: null,
  
  authorImage: null,
  authorName: null,
  authorEmail: null,
  
  factBox: null,
  
  log: Log4Moz.Service.getLogger("expmess.overlay"),

  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "MsgMsgDisplayed" ) {
      // get out of the synchronous path where we interfere with the preview
      //  window.
      window.setTimeout(this._bounce, 100, this.onMessageDisplayed);
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
        this.log.info("Conversation: " + selectedMessage.conversation.id +
                          " : " + selectedMessage.conversation.subject);
        var threadMessages = selectedMessage.conversation.messages;
        
        this.log.info("We got " + threadMessages.length + " messages");
        
        this.jsThreadMessageTreeView.messages = threadMessages;
        
        var attrFrom = Gloda.getAttrDef(Gloda.BUILT_IN, "from");
        var authorIdentityAPV = selectedMessage.getSingleAttribute(attrFrom);
        if (authorIdentityAPV == null) {
          this.log.error("authorIdentityAPV is null using attrib " +
                            attrFrom);
        }

        var authorMessages = Gloda.queryMessagesAPV([authorIdentityAPV]);
        
        this.visAuthor.messages = authorMessages;
        this.visAuthor.selectedMessage = null;
        
        // so, the e-mail address really shouldn't be all unicode-y, but this
        //  at the very least converts the string to a byte array.
        var md5hash = GlodaUtils.md5HashString(selectedMessage.from.value);
        var gravURL = "http://www.gravatar.com/avatar/" + md5hash + 
                                "?d=identicon&s=80&r=g";
        this.authorImage.src = gravURL;
        this.authorName.value = selectedMessage.from.contact.name;
        this.authorEmail.value = selectedMessage.from.value;
        
        this.updateFacts(selectedMessage);
      }
    } catch (ex) {
      this.log.info("Exception at " + ex.fileName + ":" + ex.lineNumber + ":" +
                    ex);
      this.authorImage.src = null;
      this.authorName.value = ":(";
      this.authorEmail.value = "";
      this.jsThreadMessageTreeView.messages = [];
      this.visAuthor.messages = [];
      this.visAuthor.selectedMessage = null;
    } 
  },

  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("expmess-strings");
    
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
                          getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "MsgMsgDisplayed", false);                           
    
    this.threadMessageTree = document.getElementById("threadMessageTree");
    this.jsThreadMessageTreeView = new EMTreeView(null);
    this.threadMessageTree.view = this.jsThreadMessageTreeView;
    
    this.authorCanvas = document.getElementById("authorCanvas");
    this.visAuthor = new EMVis(this.authorCanvas, null);
    this.visAuthor.render();
    
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
    for (var iAttrib=0; iAttrib < attributes.length; iAttrib++) {
      var attribDef = attributes[iAttrib][0];
      var value = attributes[iAttrib][1];
      
      var factItem = document.createElementNS(XUL_NS, "richlistitem");
      var desc = document.createElementNS(XUL_NS, "description");
      
      // TODO parameter-impact on noun/attribute issue.
      var explanation = attribDef.explain(null, null, value);
      this.log.debug("EXPLANATION: " + explanation);
      desc.setAttribute("value", explanation);
      factItem.appendChild(desc);
      
      factBox.appendChild(factItem);
    }
  },
  
  onFactClicked: function(event) {
    this.log.debug("FACT CLICKED: " + event);
  },
  
  onFactSelected: function(event) {
    this.log.debug("FACT SELECTED: " + event);
  },
  
  onGoIndex: function() {
    GlodaIndexer.indexEverything();
  },
};
window.addEventListener("load", function(e) { expmess.onLoad(e); }, false);
window.addEventListener("unload", function(e) { expmess.onUnload(e); }, false);

