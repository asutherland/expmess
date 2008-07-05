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
Components.utils.import("resource://gloda/modules/gloda.js");
Components.utils.import("resource://gloda/modules/log4moz.js");

var expmess = {
  expMessageTree: null,
  jsMessageTreeView: null,
  
  log: Log4Moz.Service.getLogger("expmess.overlay"),

  _headerHandler: {
    onStartHeaders: function() {
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
    },
      
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
  },
  onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                this.strings.getString("helloMessage"));
  },

};
window.addEventListener("load", function(e) { expmess.onLoad(e); }, false);
