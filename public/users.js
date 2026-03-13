document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈'; // Change icon 
});



// //  Handling  signup and login 
 
// import { existsSync, writeFileSync, readFileSync } from 'fs';
// import { join } from 'path';

// const filePath = join(__dirname, '../users.json');

// // Ensure users.json exists
// if (!existsSync(filePath)) {
//     writeFileSync(filePath, JSON.stringify([]));
// }

// function readUsers() {
//     const data = readFileSync(filePath, 'utf-8');
//     return JSON.parse(data);
// }

// function writeUsers(users) {
//     writeFileSync(filePath, JSON.stringify(users, null, 2));
// }

// // Sign Up function
// function signUp(username, password) {
//     let users = readUsers();

//     if (users.find(u => u.username === username)) {
//         return { success: false, message: 'User already exists!' };
//     }

//     users.push({ username, password });
//     writeUsers(users);
//     return { success: true, message: 'User registered successfully!' };
// }

// // Login function
// function login(username, password) {
//     let users = readUsers();

//     const user = users.find(u => u.username === username && u.password === password);
//     if (user) {
//         return { success: true, message: 'Login successful!' };
//     } else {
//         return { success: false, message: 'Invalid username or password!' };
//     }
// }

// export default { signUp, login };
function showMessage(text, color = "#222") {
  const box = document.getElementById("messageBox");
  box.textContent = text;
  box.style.background = color;
  box.style.display = "block";
  setTimeout(() => box.style.display = "none", 3000); // hide after 3 s
}


const databaseURL = "https://ifest2026-default-rtdb.europe-west1.firebasedatabase.app/logging.json"; // firebase url

// _______________SIGN UP _______________
function signUpUser(family_name, password,gmail) {
    document.getElementById('family_name').value="";
    document.getElementById('password').value ="";
    document.getElementById('gmail').value ="";
    
    if (!family_name || !password) {
        showMessage("⚠️ Please enter both Family Name and Password!","red");
        return;
    }

    //  1: takhou data
    fetch(databaseURL)
        .then(response => {
            if (!response.ok) throw new Error("Failed to load users");
            return response.json();
        })
        .then(users => {
            //  2: Check existence
            const existingUser = users && Object.values(users).find(
                user => user.family_name === family_name
            );

            if (existingUser) {
                showMessage(`⚠️ The family name "${family_name}" is already used.\nPlease try another one.`,"red");
                return;
            }

            //  3:  new user
            const userData = {
                family_name: family_name,
                password: password ,
                gmail: gmail
            };

            fetch(databaseURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(userData)
            })
            .then(response => {
                if (!response.ok) throw new Error("Failed to store user data");
                return response.json();
            })
            .then(() => {
                    localStorage.setItem("logging_message", `✅ Welcome ${family_name}s Sign-up successful! Your account has been created.`);
                    window.location.href = "main_UI.html";

            })
            .catch(() => {
                showMessage("❌ Error: Unable to save your data. Please try again later.","red");
            });
        })
        .catch(() => {
            showMessage("❌ Error: Failed to connect to the database.","red");
        });
}
// _______________LOG IN _______________
function loginUser(family_name, password) {
    document.getElementById('family_name').value="";
    document.getElementById('password').value ="";
    if (!family_name || !password) {
        showMessage("⚠️ Please enter both Family Name and Password!","red");
        return;
    }

    //  Get all users
    fetch(databaseURL)
        .then(response => {
            if (!response.ok) throw new Error("Failed to load users");
            return response.json();
        })
        .then(users => {
            if (!users) {
                showMessage("❌ No users found. Please sign up first!","red");
                return;
            }

            //  Find matching user
            const matchedUser = Object.values(users).find(
                user => user.family_name === family_name && user.password === password
            );

            //  Check match result
            if (matchedUser) {
                // Example: redirect or open main app window
                localStorage.setItem("logging_message", `✅ Welcome back ,${family_name}s !`);
                window.location.href = "main_UI.html";
            } else {
                showMessage("❌ Incorrect Family Name or Password. Please try again!","red");
            }
        })
        .catch(() => {
            showMessage("❌ Error: Unable to connect to the database.","red");
        });
}
const family_name="ben_ameur";
module.exports = {family_name};