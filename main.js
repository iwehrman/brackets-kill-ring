/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, CodeMirror */

define(function (require, exports, module) {
    "use strict";
	
    var EditorManager       = brackets.getModule("editor/EditorManager"),
        CommandManager      = brackets.getModule("command/CommandManager"),
		Menus               = brackets.getModule("command/Menus"),
        AppInit             = brackets.getModule("utils/AppInit");
	

	function KillRing() {
		this.ring = [];
        this.index = null;
        this.MAX_BUFFER_LENGTH = 100;
        
        this.last_yank_begin = null;
        this.last_yank_end = null;
        
	}
	
	KillRing.prototype.push = function (text) {
        if (this.ring.length > this.MAX_BUFFER_LENGTH) {
            this.ring.shift();
        }
        
        this.ring.push(text);
        this.index = this.ring.length - 1;
	};
	
	KillRing.prototype.peek = function () {
        if (this.ring.length > 0) {
            return this.ring[this.index];
        } else {
            return null;
        }
	};
    
    KillRing.prototype.rotate = function () {
        if (this.index !== null) {
            if (this.index > 0) {
                --this.index;
            } else {
                this.index = this.ring.length - 1;
            }
            return this.index;
        } else {
            return null;
        }
    };

	function _getKillRing(editor) {
        if (editor) {
            if (!(editor.killRing)) {
                editor.killRing = new KillRing();
            }
            return editor.killRing;
        } else {
            return null;
        }
	}
	
	function _kill(editor) {
        editor = editor || EditorManager.getFocusedEditor();
        var killRing = _getKillRing(editor);
        
        if (killRing) {
            
            var doc = editor.document;
            var text, startRange, endRange;
            
            if (editor.hasSelection()) {
                var selection = editor.getSelection();
                startRange = selection.start;
                endRange = selection.end;
            } else {
                var cursor = editor.getCursorPos(false);
                var line = doc.getLine(cursor.line);

                startRange = {line : cursor.line, ch: cursor.ch};
                endRange = {line : cursor.line, ch : line.length};
            }
            
            text = doc.getRange(startRange, endRange);
            killRing.push(text);
            doc.replaceRange("", startRange, endRange);
            
            // last command was not a yank, so reset yank position
            killRing.last_yank_begin = null;
            killRing.last_yank_end = null;
        }
	}
	
	function _yank(editor, again) {
        editor = editor || EditorManager.getFocusedEditor();
        var killRing = _getKillRing(editor);
        
        if (killRing) {
            var text = killRing.peek();
            
            if (text !== null) {
                var cursor = editor.getCursorPos(false);
                var doc = editor.document;
                
                // if there was a previous yank and we're yanking again, replace that text
                if (again) {
                    doc.replaceRange(text, killRing.last_yank_begin, killRing.last_yank_end);
                } else { // otherwise yank at cursor
                    killRing.last_yank_begin = { line: cursor.line, ch: cursor.ch};
                    doc.replaceRange(text, cursor);
                }
                
                // update last yank position
                cursor = editor.getCursorPos(false);
                killRing.last_yank_end = { line: cursor.line, ch: cursor.ch};
            }
        }
        
	}
    
    function _yank_pop(editor) {
        editor = editor || EditorManager.getFocusedEditor();
        var killRing = _getKillRing(editor);
        
        if (killRing) {
            var cursor = editor.getCursorPos(false);
            
            if (cursor.line === killRing.last_yank_end.line &&
                    cursor.ch === killRing.last_yank_end.ch) {
                killRing.rotate();
                _yank(editor, true);
            }
        }
    }

    // load everything when brackets is done loading
    AppInit.appReady(function () {

		var CMD_KILL = "Kill";
		var CMD_YANK = "Yank";
        var CMD_YANK_AGAIN = "Yank Again";
		
		var EDIT_KILL = "edit.kill";
		var EDIT_YANK = "edit.yank";
		var EDIT_YANK_AGAIN = "edit.yankAgain";
        
		CommandManager.register(CMD_KILL, EDIT_KILL, _kill);
		CommandManager.register(CMD_YANK, EDIT_YANK, _yank);
        CommandManager.register(CMD_YANK_AGAIN, EDIT_YANK_AGAIN, _yank_pop);
        
        function controlKey(char) {
            return [{key: "Ctrl-" + char, platform: "win"},
                    {key: "Ctrl-" + char, platform: "mac"}];
        }
        
        function metaKey(char) {
            return [{key: "Alt-" + char, platform: "win"},
                    {key: "Cmd-" + char, platform: "mac"}];
        }
        
        var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
        menu.addMenuItem(Menus.DIVIDER);
        menu.addMenuItem(EDIT_KILL, controlKey('K'));
        menu.addMenuItem(EDIT_YANK, controlKey('Y'));
        menu.addMenuItem(EDIT_YANK_AGAIN, metaKey('Y'));

    });
					 
});
