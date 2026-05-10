#Requires -Version 5.1
<#
.SYNOPSIS
  Drag JPG / PNG / WebP files onto this script (via the .bat launcher) to
  resize them to max 1800 px wide, compress to JPEG quality 82, and save
  them directly into the neewoody-site/images/ folder ready to push.
#>
param(
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$Files
)

Add-Type -AssemblyName System.Drawing

$DestFolder = 'D:\Neewoody Custom Woodwork\Website\Neewoodygh Claude\neewoody-site\images'
$MaxWidth   = 1800
$Quality    = 82        # JPEG quality 0–100

Write-Host ''
Write-Host '  Neewoody Image Optimiser' -ForegroundColor Cyan
Write-Host "  Destination: $DestFolder" -ForegroundColor DarkGray
Write-Host ''

if (-not $Files -or $Files.Count -eq 0) {
    Write-Host '  No files supplied.' -ForegroundColor Yellow
    Write-Host '  Drag image files onto "Optimise Images - Drop Here.bat" on your Desktop.' -ForegroundColor Yellow
    Write-Host ''
    Read-Host '  Press Enter to close'
    exit 0
}

if (-not (Test-Path $DestFolder)) {
    Write-Host "  ERROR: images/ folder not found at:" -ForegroundColor Red
    Write-Host "  $DestFolder" -ForegroundColor Red
    Write-Host ''
    Read-Host '  Press Enter to close'
    exit 1
}

# JPEG encoder + quality parameter
$JpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.FormatDescription -eq 'JPEG' } |
    Select-Object -First 1

$EncParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$EncParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality
)

$ok = 0; $skipped = 0; $errors = 0

foreach ($file in $Files) {
    $name = [System.IO.Path]::GetFileName($file)
    $ext  = [System.IO.Path]::GetExtension($file).ToLower()

    if ($ext -notin @('.jpg', '.jpeg', '.png', '.webp')) {
        Write-Host "  SKIP   $name  (unsupported type: $ext)" -ForegroundColor DarkYellow
        $skipped++
        continue
    }

    $src = $null
    $bmp = $null

    try {
        $src  = [System.Drawing.Image]::FromFile($file)
        $srcW = $src.Width
        $srcH = $src.Height

        if ($srcW -gt $MaxWidth) {
            $scale = $MaxWidth / [double]$srcW
            $newW  = $MaxWidth
            $newH  = [int]($srcH * $scale)
        } else {
            $newW = $srcW
            $newH = $srcH
        }

        # 24bpp RGB bitmap (no alpha — flattens any transparent PNGs onto white)
        $bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $g   = [System.Drawing.Graphics]::FromImage($bmp)
        try {
            $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $g.Clear([System.Drawing.Color]::White)
            $g.DrawImage($src, 0, 0, $newW, $newH)
        } finally {
            $g.Dispose()
        }

        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file)
        $outPath  = Join-Path $DestFolder "$baseName.jpg"

        $bmp.Save($outPath, $JpegCodec, $EncParams)

        $inKB  = [int]((Get-Item $file).Length   / 1KB)
        $outKB = [int]((Get-Item $outPath).Length / 1KB)
        $dim   = if ($srcW -gt $MaxWidth) { "${srcW}px → ${MaxWidth}px" } else { "${srcW}px (no resize)" }

        Write-Host "  OK     $baseName.jpg  ($dim | ${inKB}KB → ${outKB}KB)" -ForegroundColor Green
        $ok++
    }
    catch {
        Write-Host "  ERROR  $name" -ForegroundColor Red
        Write-Host "         $($_.Exception.Message)" -ForegroundColor DarkRed
        $errors++
    }
    finally {
        if ($null -ne $bmp) { $bmp.Dispose() }
        if ($null -ne $src) { $src.Dispose() }
    }
}

Write-Host ''
if ($ok)      { Write-Host "  $ok file(s) saved to images/" -ForegroundColor Green }
if ($skipped) { Write-Host "  $skipped file(s) skipped" -ForegroundColor DarkYellow }
if ($errors)  { Write-Host "  $errors file(s) failed" -ForegroundColor Red }
Write-Host ''
Read-Host '  Press Enter to close'
