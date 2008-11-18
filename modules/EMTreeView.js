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

EXPORTED_SYMBOLS = ['EMTreeView'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://app/modules/gloda/log4moz.js");

const LOG = Log4Moz.Service.getLogger("expmess.EMTreeView");

function EMTreeView(aMessages) {
  this.treeBox = null;
  this.selection = null;
  
  this._messages = aMessages;
}

EMTreeView.prototype = {
  _dateSortFunc: function EMTVDateSortFunc(aMessage, aNotherMessage) {
    let aDate = aMessage.date;
    let bDate = aNotherMessage.date;
    
    return aDate - bDate;
  },
  
  // ignoring nsIScriptableDateFormat: @mozilla.org/intl/scriptabledateformat;1

  get messages() { return this._messages; },
  set messages(aMessages) {
    if (this.treeBox != null && this._messages != null)
      this.treeBox.rowCountChanged(0, -this._messages.length);
  
    this._messages = aMessages;
    // M0: let's sort by date... and let's mutate in place, why not?
    this._messages.sort(this._dateSortFunc);
    
    if (this.treeBox != null && this._messages != null) {
      if (this._messages != null)
        this.treeBox.rowCountChanged(0, this._messages.length);
    }
  },

  get rowCount() {
    if (this._messages == null) {
      //LOG.debug("row-count retrieval: no messages!");
      return 0;
    }
    
    //LOG.debug("row-count retrieval: " + this._messages.length);
    return this._messages.length;
  },
  
  setTree: function EMTVSetTree(treeBox) {
    //LOG.debug("received treeBox: " + treeBox);
    this.treeBox = treeBox;
  },

  // this is only needed for M0; once we hit M1 we can take it out since we
  //  will be largely living in a post-decoding world.  And really, the parts
  //  where we aren't should be smoothed over in the gloda abstractions anyways.
  _mimeConverter: null,
  _deMime: function EMTVIndexDeMime(aString) {
    if (this._mimeConverter == null) {
      this._mimeConverter = Cc["@mozilla.org/messenger/mimeconverter;1"].
                            getService(Ci.nsIMimeConverter);
    }
    
    return this._mimeConverter.decodeMimeHeader(aString, null, false, true);
  },
  
  getCellText: function(idx, column) {
    if (this._messages == null || idx >= this._messages.length) {
      LOG.warning("illegal request: " + idx + ", " + column);
      return null;
    }
    
    let message = this._messages[idx];
    // we no longer need the message header
    //let msgHdr = message.folderMessage;
    
    // sender, subject, date
    if (column.index == 0)
      return message.from.contact.name;
    else if (column.index == 1)
      return message.conversation.subject;
    else if (column.index == 2)
      return message.date.toLocaleDateString();
    else
      return "whaaa?";
  },
  
  isContainer: function(idx)         { return false; },
  isContainerOpen: function(idx)     { return false; },
  isContainerEmpty: function(idx)    { return false; },
  isSeparator: function(idx)         { return false; },
  isSorted: function()               { return false; },
  isEditable: function(idx, column)  { return false; },
  
  getParentIndex: function(idx) { return null; },
  getLevel: function(idx) { return 0; },
  
  hasNextSibling: function(idx, after) { return false; },
  toggleOpenState: function(idx) {},
  
  getImageSrc: function(idx, column) {},
  getProgressMode : function(idx,column) {},
  getCellValue: function(idx, column) {},
  cycleHeader: function(col, elem) {},
  selectionChanged: function() {},
  cycleCell: function(idx, column) {},
  performAction: function(action) {LOG.info("perform action: " + action); },
  performActionOnCell: function(action, index, column) {
    LOG.info("cell perform action: " + action + ", " + index + ", " + column);
  },
  getRowProperties: function(idx, column, prop) {},
  getCellProperties: function(idx, column, prop) {},
  getColumnProperties: function(column, element, prop) {},  
};