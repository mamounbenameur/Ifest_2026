const {app,BrowserWindow }=
require('electron');

function createWindow (){
    const win =new BrowserWindow({
        width:900,
        height :800,
           webPreferences: {
                nodeIntegration: true,   
                contextIsolation: false, 
                webSecurity: false     
    }

    });
    win.loadFile('public/home.html');   
}
app.whenReady().then(createWindow);
//Quit the app window 
app.on('window-all-closed',()=> {
    if (process.platform !== 'darwin')
        app.quit();
});

