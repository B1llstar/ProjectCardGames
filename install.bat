@echo off
echo Installing Project: Board Games dependencies...

echo.
echo Installing root dependencies...
call npm install

echo.
echo Installing server dependencies...
cd server
call npm install
cd ..

echo.
echo Installing client dependencies...
cd client
call npm install
cd ..

echo.
echo Installation complete!
echo.
echo To start the development server, run:
echo npm run dev
echo.
echo This will start both the WebSocket server (port 3001) and Vue client (port 5173)
pause
