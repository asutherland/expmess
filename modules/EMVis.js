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

EXPORTED_SYMBOLS = ['EMVis'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gloda/modules/log4moz.js");

const LOG = Log4Moz.Service.getLogger("expmess.EMVis");

// The Tango color palette is public domain. and pretty.
const TANGO_COLORS = [
  ['#fcaf3e', '#f57900', '#ce5c00'], // orange
  ['#8ae234', '#73d216', '#4e9a06'], // chameleon
  ['#729fcf', '#3a65a4', '#204a87'], // sky blue
  ['#ad7fa8', '#75507b', '#5c3566'], // plum
  ['#ef2929', '#cc0000', '#a40000'], // scarlet red
  ['#fce94f', '#edd400', '#c4a000'], // butter
  ['#e9b97e', '#c17d11', '#8f5902'], // chocolate
];
const TANGO_ALUMINUM = [
  '#eeeeec', '#d3d7cf', '#babdb6',
  '#888a86', '#555753', '#2e3436'];

function EMVis(aElem, aMessages) {
  this._elem = aElem;
  this._messages = aMessages;
  this._selectedConversationIDs = {};
  this._selectedMessageIDs = {};
  
  this._aggregatedMessages = null;
}

function compareMessageDates(aMsg, aNotherMessage) {
  return aMsg.date.getTime() - aNotherMessage.date.getTime();
}
 
EMVis.prototype = {
  set messages(aMessages) {
    if (aMessages == null)
      aMessages = [];
    this._messages = aMessages;
    this._aggregatedMessages = null;
    this.render();
  },
  
  set selectedMessage(aMessage) {
    this._selectedMessageIDs = {};
    this._selectedConversationIDs = {};

    if (aMessage !== null) {
      this._selectedMessageIDs[aMessage.id] = TANGO_COLORS[2][1];
      this._selectedConversationIDs[aMessage.conversationID] = TANGO_COLORS[2][0];
    }

    this.render();
  },

  _prepareAgg: function em_vis_prepare() {
    if (this._aggregatedMessages != null)
      return;
    
    let messagesByDate = this._messages.concat();
    messagesByDate.sort(compareMessageDates);
    
    let aggregated = [];
    let bucket = null;
    let bucketDate;
    for (let iMessage=0; iMessage < messagesByDate.length; iMessage++) {
      let message = messagesByDate[iMessage];
      let threshDate = new Date(message.date);
      // this seems dumb
      threshDate.setHours(0);
      threshDate.setMinutes(0);
      threshDate.setSeconds(0);
      threshDate.setMilliseconds(0);
      if ((threshDate - bucketDate) != 0) {
        bucketDate = threshDate;
        bucket = [bucketDate];
        aggregated.push(bucket);
      }
      bucket.push(message);
    }
    
    this._aggregatedMessages = aggregated;
  },

  render: function em_vis_render() {
    //LOG.debug("PRE width: " + this._elem.width + " style width: " +
    //          this._elem.style.width);
    //this._elem.style.width = this._elem.width + "px";
    //LOG.debug("POST width: " + this._elem.width + " style width: " +
    //          this._elem.style.width);
  
    let ctx = this._elem.getContext('2d');
    
    // fill with white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this._elem.width, this._elem.height);


    if (this._messages == null)
      return; 

    this._prepareAgg();
  
    let leftPad = 1;
    let bottom = this._elem.height;
    let width = this._elem.width - leftPad * 2;

    if (this._aggregatedMessages.length < 2)
      return;
    
    let agg = this._aggregatedMessages;
    
    let firstTS = agg[0][0].valueOf();
    let lastTS = agg[agg.length-1][0].valueOf();
    let tsRange = lastTS - firstTS;
    
    let msgHeight = 2;
    
    for (let iAgg=0; iAgg < agg.length; iAgg++) {
      let bucket = agg[iAgg];
      let threshTS = bucket[0].valueOf();
      let curY = bottom;
      
      let x = leftPad + Math.floor((threshTS - firstTS) * width / tsRange);
      
      for (let iMsg=1; iMsg < bucket.length; iMsg++) {
        let message = bucket[iMsg];
        let color;
        let width;
        if (message.id in this._selectedMessageIDs) {
          color = this._selectedMessageIDs[message.id];
          width = 6;
        }
        else if (message.conversationID in this._selectedConversationIDs) {
          color = this._selectedConversationIDs[message.conversationID];
          width = 4;
        }
        else {
          color = TANGO_ALUMINUM[1];
          width = 2;
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        
        ctx.beginPath();
        ctx.moveTo(x, curY);
        ctx.lineTo(x, curY - msgHeight);
        ctx.stroke();
        curY -= msgHeight;
      }
    }
  },
};