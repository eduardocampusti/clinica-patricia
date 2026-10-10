# Fixtures determinísticas locais. Não usam identidade de clínica real nem rede.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$cfgDestino = Join-Path (Get-Location) 'scratch/configuracoes-sequencia/imagens'
New-Item -ItemType Directory -Force -Path $cfgDestino | Out-Null
foreach ($cfgPar in @(@('a', '#006194'), @('b', '#4B2C83'))) {
 $cfgBitmap = [System.Drawing.Bitmap]::new(96,96)
 $cfgGraphics = [System.Drawing.Graphics]::FromImage($cfgBitmap)
 $cfgBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($cfgPar[1]))
 $cfgFont = [System.Drawing.Font]::new('Arial',11,[System.Drawing.FontStyle]::Bold)
 try {
  $cfgGraphics.Clear([System.Drawing.Color]::Transparent)
  $cfgGraphics.FillEllipse($cfgBrush,4,4,88,88)
  $cfgGraphics.DrawString('DEMO', $cfgFont, [System.Drawing.Brushes]::White, 23,35)
  $cfgGraphics.DrawString($cfgPar[0].ToUpperInvariant(), $cfgFont, [System.Drawing.Brushes]::White, 41,55)
  $cfgBitmap.Save((Join-Path $cfgDestino ('logo-demo-'+$cfgPar[0]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 } finally { $cfgFont.Dispose();$cfgBrush.Dispose();$cfgGraphics.Dispose();$cfgBitmap.Dispose() }
}
[System.IO.File]::WriteAllBytes((Join-Path $cfgDestino 'png-invalido.png'),[System.Text.Encoding]::UTF8.GetBytes('DEMONSTRACAO - nao e uma imagem'))
Write-Output 'Preparadas duas logos transparentes 96x96 e uma imagem inválida, somente em scratch.'
