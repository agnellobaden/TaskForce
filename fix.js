const fs = require('fs');
const path = 'app.js';
try {
    let content = fs.readFileSync(path, 'utf8');

    // Replacements
    const map = {
        'Ã¤': 'ä',
        'Ã¶': 'ö',
        'Ã¼': 'ü',
        'ÃŸ': 'ß',
        'Ã„': 'Ä',
        'Ã–': 'Ö',
        'Ãœ': 'Ü',
        'â‚¬': '€',
        'â€“': '–',
        'â€¦': '…',
        'âœ…': '✅',
        'âœ¨': '✨',
        'ðŸš€': '🚀',
        'ðŸ”’': '🔒',
        'ðŸ‘‘': '👑',
        'ðŸ”¥': '🔥',
        'ðŸ›’': '🛒',
        'ðŸ”´': '🔴',
        'ðŸŸ¢': '🟢',
        'â¬†ï¸': '⬆️',
        'âš¡': '⚡',
        'â Œ': '❌',
        'ðŸ“': '📍',
        'â€¢': '•',
        'Ã©': 'é'
    };

    for (const [key, val] of Object.entries(map)) {
        content = content.split(key).join(val);
    }

    fs.writeFileSync(path, content, 'utf8');
    console.log("Done fixing app.js");
} catch (e) {
    console.error(e);
}
