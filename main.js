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
/*global define, brackets */

define(function (require, exports, module) {
    "use strict";

    var EditorManager           = brackets.getModule("editor/EditorManager"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        Menus                   = brackets.getModule("command/Menus"),
        AppInit                 = brackets.getModule("utils/AppInit");

    var MAX_BUFFER_LENGTH = 100;
    
    var ring = [],
        index = null,
        last_kill_begin = null,
        last_yank_begin = null,
        last_yank_end = null;

    function push(text) {
        if (ring.length > MAX_BUFFER_LENGTH) {
            ring.shift();
        }
        
        ring.push(text);
        index = ring.length - 1;
    }
    
    function concat(text) {
        ring[index] = ring[index] + text;
    }

    function peek() {
        if (ring.length > 0) {
            return ring[index];
        } else {
            return null;
        }
    }
    
    function rotate() {
        if (index !== null) {
            if (index > 0) {
                index--;
            } else {
                index = ring.length - 1;
            }
        }
    }


    function kill(editor) {
        editor = editor || EditorManager.getFocusedEditor();
                    
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
        
        // if line is empty, kill the next linebreak instead
        if (text === "") {
            endRange = {line : cursor.line + 1, ch : 0};
            text = doc.getRange(startRange, endRange);
        }
                    
        if (text !== null && text.length > 0) {
            // if the cursor hasn't moved between kills, concatenate kills
            if (last_kill_begin !== null &&
                    last_kill_begin.line === startRange.line &&
                    last_kill_begin.ch === startRange.ch) {
                concat(text);
            } else {
                push(text);
            }
            
            doc.replaceRange("", startRange, endRange);
        }
        
        // last command was a kill, so set last kill position 
        last_kill_begin = startRange;
        
        // last command was not a yank, so reset yank position
        last_yank_begin = null;
        last_yank_end = null;
    }

    function yank(editor, again) {
        editor = editor || EditorManager.getFocusedEditor();
        
        var text = peek();
        
        if (text !== null) {
            var cursor = editor.getCursorPos(false);
            var doc = editor.document;
            
            // if we're yanking again, replace the last yanked text
            if (again) {
                doc.replaceRange(text, last_yank_begin, last_yank_end);
            } else { // otherwise yank at cursor
                last_yank_begin = { line: cursor.line, ch: cursor.ch};
                doc.replaceRange(text, cursor);
            }
            
            // last command was not a kill, so reset last kill position
            last_kill_begin = null;
            
            // update last yank position
            cursor = editor.getCursorPos(false);
            last_yank_end = { line: cursor.line, ch: cursor.ch};
        }
        
    }
    
    function yank_pop(editor) {
        editor = editor || EditorManager.getFocusedEditor();
        
        var cursor = editor.getCursorPos(false);
        
        if (cursor.line === last_yank_end.line &&
                cursor.ch === last_yank_end.ch) {
            rotate();
            yank(editor, true);
        }
    }

    // load everything when brackets is done loading
    AppInit.appReady(function () {
        var EDIT_KILL = "edit.kill";
        var EDIT_YANK = "edit.yank";
        var EDIT_YANK_AGAIN = "edit.yankAgain";
        
        var CMD_KILL = "Kill";
        var CMD_YANK = "Yank";
        var CMD_YANK_AGAIN = "Yank Again";

        CommandManager.register(CMD_KILL, EDIT_KILL, kill);
        CommandManager.register(CMD_YANK, EDIT_YANK, yank);
        CommandManager.register(CMD_YANK_AGAIN, EDIT_YANK_AGAIN, yank_pop);
        
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
