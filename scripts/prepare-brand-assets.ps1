param(
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [string]$PublicPath = (Join-Path $PSScriptRoot '..\public')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Collections.Generic;

public static class SenaverseBrandAssets {
    public static string Create(string sourcePath, string imagePath, string faviconPath) {
        using (var source = new Bitmap(sourcePath)) {
            int left = source.Width, top = source.Height, right = -1, bottom = -1;
            // Ignore only the practically transparent outer halo when finding the crop.
            // Pixel colors and alpha inside the crop are preserved during resampling.
            for (int y = 0; y < source.Height; y++) {
                for (int x = 0; x < source.Width; x++) {
                    if (source.GetPixel(x, y).A > 4) {
                        left = Math.Min(left, x); top = Math.Min(top, y);
                        right = Math.Max(right, x); bottom = Math.Max(bottom, y);
                    }
                }
            }
            if (right < left) throw new InvalidOperationException("The source has no visible pixels.");
            const int padding = 20;
            left = Math.Max(0, left - padding); top = Math.Max(0, top - padding);
            right = Math.Min(source.Width - 1, right + padding);
            bottom = Math.Min(source.Height - 1, bottom + padding);
            var crop = new Rectangle(left, top, right - left + 1, bottom - top + 1);
            MakeHandWhite(source);
            Save(source, crop, 256, imagePath);
            Save(source, crop, 64, faviconPath);
            return String.Format("Original: {0}x{1}. Crop: {2}. Web: 256x256. Favicon: 64x64.", source.Width, source.Height, crop);
        }
    }

    private static bool[] FloodOutside(bool[] boundary, int width, int height) {
        var outside = new bool[boundary.Length];
        var queue = new Queue<int>();
        for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) {
            int index = y * width + x;
            if ((x == 0 || y == 0 || x == width - 1 || y == height - 1) && !boundary[index]) { outside[index] = true; queue.Enqueue(index); }
        }
        while (queue.Count > 0) {
            int index = queue.Dequeue(), x = index % width, y = index / width;
            foreach (int neighbor in new [] { index - 1, index + 1, index - width, index + width }) {
                if (neighbor < 0 || neighbor >= boundary.Length || outside[neighbor] || boundary[neighbor]
                    || Math.Abs(neighbor % width - x) + Math.Abs(neighbor / width - y) != 1) continue;
                outside[neighbor] = true; queue.Enqueue(neighbor);
            }
        }
        return outside;
    }

    private static void MakeHandWhite(Bitmap source) {
        int width = source.Width, height = source.Height;
        var opaque = new bool[width * height];
        for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) opaque[y * width + x] = source.GetPixel(x, y).A > 230;
        var outside = FloodOutside(opaque, width, height);
        var hand = new bool[opaque.Length];
        for (int index = 0; index < hand.Length; index++) hand[index] = !outside[index] && !opaque[index];
        // Fill tiny opaque islands in the original translucent hand, retaining the open heart and finger gaps.
        var outsideHand = FloodOutside(hand, width, height);
        int count = 0;
        for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) {
            if (!outsideHand[y * width + x]) { source.SetPixel(x, y, Color.FromArgb(255, 255, 255, 255)); count++; }
        }
        if (count < 10000 || count > 300000) throw new InvalidOperationException("The original translucent hand could not be isolated reliably. No assets were saved.");
        Console.WriteLine("White opaque hand: {0} original silhouette pixels. Exterior and gradient pixels untouched before resizing.", count);
    }

    private static void Save(Bitmap source, Rectangle crop, int size, string output) {
        using (var image = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (var graphics = Graphics.FromImage(image))
            using (var attributes = new ImageAttributes()) {
                graphics.Clear(Color.Transparent);
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                attributes.SetWrapMode(WrapMode.TileFlipXY);
                float scale = (float)size / Math.Max(crop.Width, crop.Height);
                var destination = new Rectangle((int)Math.Round((size - crop.Width * scale) / 2), (int)Math.Round((size - crop.Height * scale) / 2),
                    (int)Math.Round(crop.Width * scale), (int)Math.Round(crop.Height * scale));
                graphics.DrawImage(source, destination, crop.X, crop.Y, crop.Width, crop.Height, GraphicsUnit.Pixel, attributes);
            }
            image.Save(output, ImageFormat.Png);
        }
    }
}
'@

$brandPublicPath = [System.IO.Path]::GetFullPath($PublicPath)
$brandImagesPath = Join-Path $brandPublicPath 'images'
New-Item -ItemType Directory -Path $brandImagesPath -Force | Out-Null
$webLogoPath = Join-Path $brandImagesPath 'logo-senaverse.png'
$webFaviconPath = Join-Path $brandPublicPath 'favicon.png'
[SenaverseBrandAssets]::Create((Resolve-Path -LiteralPath $SourcePath).Path, $webLogoPath, $webFaviconPath)
Get-Item -LiteralPath $webLogoPath, $webFaviconPath | Select-Object Name, Length
