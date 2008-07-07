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

Components.utils.import("resource://expmess/modules/EMTreeView.js");
Components.utils.import("resource://gloda/modules/log4moz.js");
Components.utils.import("resource://gloda/modules/gloda.js");
Components.utils.import("resource://gloda/modules/indexer.js");

var expmess = {
  threadMessageTree: null,
  jsThreadMessageTreeView: null,
  authorMessageTree: null,
  jsAuthorMessageTreeView: null,
  indexingStatusLabel: null,
  progressFolders: null,
  progressMessages: null,
  progressListener: null,
  
  log: Log4Moz.Service.getLogger("expmess.overlay"),

  _headerHandler: {
    onStartHeaders: function() { try {
      var msgHdr = gDBView.hdrForFirstSelectedMessage;
      if (msgHdr != null) {
        var selectedMessage = Gloda.getMessageForHeader(msgHdr);
        expmess.log.info("Conversation: " + selectedMessage.conversation.id +
                          " : " + selectedMessage.conversation.subject);
        var threadMessages = selectedMessage.conversation.messages;
        
        expmess.log.info("We got " + threadMessages.length + " messages");
        
        expmess.jsThreadMessageTreeView.messages = threadMessages;
        
        var attrFrom = Gloda.getAttrDef(Gloda.BUILT_IN, "FROM");
        var authorIdentityAPV = selectedMessage.getSingleAttribute(attrFrom);
        if (authorIdentityAPV == null) {
          expmess.log.error("authorIdentityAPV is null using attrib " +
                            attrFrom);
        }
        authorMessages = Gloda.queryMessagesAPV([authorIdentityAPV]);
        
        expmess.jsAuthorMessageTreeView.messages = authorMessages;
       
      }
    } catch (ex) {} },
      
    onEndHeaders: function() {},
  },

  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("expmess-strings");
    
    this.threadMessageTree = document.getElementById("threadMessageTree");
    this.jsThreadMessageTreeView = new EMTreeView(null);
    this.threadMessageTree.view = this.jsThreadMessageTreeView;
    
    this.authorMessageTree = document.getElementById("authorMessageTree");
    this.jsAuthorMessageTreeView = new EMTreeView(null);
    this.authorMessageTree.view = this.jsAuthorMessageTreeView;
    
    gMessageListeners.push(this._headerHandler);
    
    this.indexingStatusLabel = document.getElementById("mineStatusLabel");
    this.progressFolders = document.getElementById("mineFolderProgress");
    this.progressMessages = document.getElementById("mineMessageProgress");
    
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
  
  onGoIndex: function() {
    GlodaIndexer.init(window, msgWindow);  
    GlodaIndexer.indexEverything();
  },
};
window.addEventListener("load", function(e) { expmess.onLoad(e); }, false);
window.addEventListener("unload", function(e) { expmess.onUnload(e); }, false);

