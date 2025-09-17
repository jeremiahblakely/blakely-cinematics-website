/**
 * Mail Text Formatting Module
 * Created: December 17, 2024 1:00 PM
 * Purpose: Handle text formatting and alignment functions
 */

// ============================================
// TEXT FORMATTING FUNCTIONS
// ============================================

/**
 * Format selected text in the reply textarea
 * @param {string} command - The formatting command (bold, italic, underline, strikethrough)
 */
function formatText(command) {
    const textarea = document.getElementById('replyText');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    // If no text is selected, return
    if (start === end) {
        // Insert placeholder text with formatting
        let placeholder = '';
        let cursorOffset = 0;
        
        switch(command) {
            case 'bold':
                placeholder = '**bold text**';
                cursorOffset = 2;
                break;
            case 'italic':
                placeholder = '*italic text*';
                cursorOffset = 1;
                break;
            case 'underline':
                placeholder = '__underlined text__';
                cursorOffset = 2;
                break;
            case 'strikethrough':
            case 'strike':
                placeholder = '~~strikethrough text~~';
                cursorOffset = 2;
                break;
            default:
                return;
        }
        
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        
        textarea.value = before + placeholder + after;
        
        // Position cursor inside the formatting marks
        textarea.selectionStart = start + cursorOffset;
        textarea.selectionEnd = start + placeholder.length - cursorOffset;
        textarea.focus();
        return;
    }
    
    // Format selected text
    let formattedText = '';
    
    switch(command) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'underline':
            formattedText = `__${selectedText}__`;
            break;
        case 'strikethrough':
        case 'strike':
            formattedText = `~~${selectedText}~~`;
            break;
        case 'quote':
            // Add quote formatting (line by line)
            formattedText = selectedText.split('\n').map(line => `> ${line}`).join('\n');
            break;
        default:
            formattedText = selectedText;
    }
    
    // Replace the selected text with formatted text
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    
    textarea.value = before + formattedText + after;
    
    // Reselect the formatted text
    textarea.selectionStart = start;
    textarea.selectionEnd = start + formattedText.length;
    textarea.focus();
    
    // Update word count
    updateWordCount();
}

/**
 * Update the word count display
 */
function updateWordCount() {
    const textarea = document.getElementById('replyText');
    const wordCountEl = document.getElementById('wordCount');
    
    if (!textarea || !wordCountEl) return;
    
    const text = textarea.value.trim();
    const wordCount = text === '' ? 0 : text.split(/\s+/).length;
    
    wordCountEl.textContent = wordCount + ' word' + (wordCount !== 1 ? 's' : '');
}

/**
 * Align text in the textarea
 * @param {string} alignment - left, center, or right
 */
function alignText(alignment) {
    const textarea = document.getElementById('replyText');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
    }
    
    let lineEnd = end;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
        lineEnd++;
    }
    
    const selectedLines = text.substring(lineStart, lineEnd);
    let alignedText = '';
    
    switch(alignment) {
        case 'left':
            alignedText = selectedLines;
            break;
        case 'center':
            alignedText = selectedLines.split('\n')
                .map(line => '    ' + line.trim() + '    ').join('\n');
            break;
        case 'right':
            alignedText = selectedLines.split('\n')
                .map(line => '        ' + line.trim()).join('\n');
            break;
        default:
            alignedText = selectedLines;
    }
    
    textarea.value = text.substring(0, lineStart) + alignedText + text.substring(lineEnd);
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + alignedText.length;
    textarea.focus();
    updateWordCount();
}

/**
 * Insert a list (bullet or numbered)
 * @param {string} type - 'bullet' or 'number'
 */
function insertList(type) {
    const textarea = document.getElementById('replyText');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
    }
    
    let lineEnd = end;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
        lineEnd++;
    }
    
    const selectedLines = text.substring(lineStart, lineEnd);
    const lines = selectedLines.split('\n');
    let listText = '';
    
    if (type === 'bullet') {
        listText = lines.map(line => {
            if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
                return line.replace(/^(\s*)[•\-]\s*/, '$1');
            }
            if (line.trim().match(/^\d+\.\s/)) {
                return line.replace(/^(\s*)\d+\.\s*/, '$1• ');
            }
            return line.trim() ? '• ' + line.trim() : line;
        }).join('\n');
    } else if (type === 'number') {
        let number = 1;
        listText = lines.map(line => {
            if (line.trim().match(/^\d+\.\s/)) {
                return line.replace(/^(\s*)\d+\.\s*/, '$1');
            }
            if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
                return line.replace(/^(\s*)[•\-]\s*/, '$1' + (number++) + '. ');
            }
            return line.trim() ? (number++) + '. ' + line.trim() : line;
        }).join('\n');
    }
    
    textarea.value = text.substring(0, lineStart) + listText + text.substring(lineEnd);
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + listText.length;
    textarea.focus();
    updateWordCount();
}

console.log('[Mail Formatting] Module loaded');