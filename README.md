brackets-kill-ring
==================

A brackets extension that provides a vaguely emacs-style kill ring. 
The Kill command (C-k) kills the rest of the line or the selection, and 
repeated kills are merged into a single entry in the ring. The Yank 
command (C-y) inserts the last-inserted entry from the ring. The Yank Again
command (M-y) replaces the last yank with the previous entry in the kill ring. 