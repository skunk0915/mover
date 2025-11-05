@echo off
chcp 65001 >nul
echo ===================================
echo   ローカルサーバーを起動します
echo ===================================
echo.
echo ブラウザで以下のURLを開いてください:
echo http://localhost:8000/video_viewer.html
echo.
echo サーバーを停止するには Ctrl+C を押してください
echo.
echo ===================================
echo.

REM Pythonがインストールされているか確認
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server 8000
) else (
    echo エラー: Python が見つかりません
    echo Python をインストールするか、HTMLファイルを直接開いてください
    echo （HTMLファイルには埋め込みデータがあるため動作します）
    pause
)
