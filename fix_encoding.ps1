$path = 'C:\Users\aagne\OneDrive\Desktop\Neuer Ordner\TaskForce-main\app.js'
$c = Get-Content -Path $path -Raw -Encoding UTF8

# German
$c = $c.Replace('Ã¤', 'ä')
$c = $c.Replace('Ã¶', 'ö')
$c = $c.Replace('Ã¼', 'ü')
$c = $c.Replace('ÃŸ', 'ß')
$c = $c.Replace('Ã„', 'Ä')
$c = $c.Replace('Ã–', 'Ö')
$c = $c.Replace('Ãœ', 'Ü')
$c = $c.Replace('â‚¬', '€')

# Symbols
$c = $c.Replace('â€“', '–')
$c = $c.Replace('â€¦', '…')

# Emojis (Known)
$c = $c.Replace('âœ…', '✅')
$c = $c.Replace('âœ¨', '✨')
$c = $c.Replace('ðŸš€', '🚀')
$c = $c.Replace('ðŸ”’', '🔒')
$c = $c.Replace('ðŸ‘‘', '👑')
$c = $c.Replace('ðŸ”¥', '🔥')
$c = $c.Replace('ðŸ›’', '🛒')
$c = $c.Replace('ðŸ”´', '🔴')
$c = $c.Replace('ðŸŸ¢', '🟢')
$c = $c.Replace('â¬†ï¸', '⬆️')
$c = $c.Replace('âš¡', '⚡')

# Tricky ones from file view
$c = $c.Replace('â Œ', '❌')
$c = $c.Replace('ðŸ“', '📍')

# Write back
[IO.File]::WriteAllText($path, $c)
Write-Host "Fixed encoding in app.js"
