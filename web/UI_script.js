document.addEventListener('DOMContentLoaded', () => {
    // --- SHARED UI ELEMENTS ---
    const menuToggle = document.getElementById('menu-toggle');
    const menuDropdown = document.getElementById('menu-dropdown');
    const menuContainer = document.getElementById('menu-container');
    const membersList = document.getElementById('membersList');

    // --- PAGE A  (Circular Progress) ---
    const mainPercentage = document.querySelector('.percentage');
    const liquid = document.querySelector('.liquid');
    const volumeText = document.querySelector('.volume-text');

    // --- PAGE B  (Profile View) ---
    const memberModal = document.getElementById('memberModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeBtn = document.querySelector('.close-btn');
    const memberForm = document.getElementById('memberForm');
    const familyTitle = document.getElementById('familyName');
    const mainDropZone = document.getElementById('drop-zone');
    const mainImageInput = document.getElementById('mainImageInput');
    const modalDropZone = document.getElementById('modal-drop-zone');
    const memberImageInput = document.getElementById('memberImageInput');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const resetConfirmModal = document.getElementById('resetConfirmModal');
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    const cancelResetBtn = document.getElementById('cancelResetBtn');

    // --- STATE ---
    let currentImageData = null;
    let members = JSON.parse(localStorage.getItem('aquaTrackMembers')) || [];
    let mainProfileImage = localStorage.getItem('aquaTrackMainImage');
    let familyName = localStorage.getItem('aquaTrackFamilyName') || "Family - Name";
    let unallocatedWater = parseFloat(localStorage.getItem('aquaTrackUnallocatedWater')) || 0; // Track water for unknown members
    const databaseURL = "https://ifest2026-default-rtdb.europe-west1.firebasedatabase.app/Q_used.json";

    // --- INITIALIZATION ---
    // Migration: Ensure all members have ID = Name (for consistency)
    if (Array.isArray(members)) {
        let needsSave = false;
        members = members.map(m => {
            if (!m) return m;
            const currentName = String(m.name || "").trim();
            // If ID is numeric or missing, set it to the name
            if (!m.id || !isNaN(m.id)) {
                m.id = currentName;
                needsSave = true;
            }
            return m;
        }).filter(m => m && m.name); // Remove any nulls/corrupted entries

        if (needsSave) saveMembers();
    }
    renderMembers();

    //  Menu logic
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!menuContainer.contains(e.target)) {
                menuDropdown.classList.add('hidden');
            }
        });
    }

    // Logging Message 
    const l_logging_message = localStorage.getItem("logging_message");
    if (l_logging_message) {
        showMessage(l_logging_message, "green");
        localStorage.removeItem("logging_message");
    }

    // Page A Logic (Progress Section)
    if (mainPercentage && liquid && volumeText) {
        updateGlobalStats();
    }

    function updateGlobalStats() {
        const totalGoal = members.reduce((sum, m) => sum + (parseFloat(m.target) || 0), 0) || 0;
        let totalIntake = members.reduce((sum, m) => sum + (parseFloat(m.current) || 0), 0);
        
        // Add water from unknown members to the global intake
        totalIntake += unallocatedWater;
        
        const globalPercentage = totalGoal > 0 ? Math.round((totalIntake / totalGoal) * 100) : 0;
        
        updateMainDisplay(totalIntake, totalGoal, globalPercentage);
    }

    // Page B Logic (Profile View)
    if (familyTitle) {
        familyTitle.innerText = familyName;
        familyTitle.contentEditable = true;
        familyTitle.onblur = () => {
            let newTitle = familyTitle.innerText.trim();
            if (newTitle === "") {
                newTitle = "Family - Name";
                familyTitle.innerText = newTitle;
            }
            familyName = newTitle;
            localStorage.setItem('aquaTrackFamilyName', familyName);
        };
        familyTitle.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); familyTitle.blur(); } };
    }

    if (mainProfileImage && mainDropZone) {
        updateMainProfileUI(mainProfileImage);
    }

    if (mainDropZone) {
        mainDropZone.onclick = () => mainImageInput.click();
        mainImageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) handleImageFile(file, (data) => saveMainProfileImage(data));
        };
        setupDragDrop(mainDropZone, (file) => handleImageFile(file, (data) => saveMainProfileImage(data)));
    }

    if (openModalBtn) {
        openModalBtn.onclick = () => { memberModal.style.display = "block"; resetImageUpload(); };
        closeBtn.onclick = () => memberModal.style.display = "none";
        window.onclick = (e) => { if (e.target == memberModal) memberModal.style.display = "none"; };

        if (modalDropZone) {
            modalDropZone.onclick = () => memberImageInput.click();
            memberImageInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) handleImageFile(file, (data) => {
                    currentImageData = data;
                    previewImg.src = data;
                    imagePreview.classList.remove('hidden');
                    modalDropZone.querySelector('span').innerText = "Image Selected";
                });
            };
            setupDragDrop(modalDropZone, (file) => handleImageFile(file, (data) => {
                currentImageData = data;
                previewImg.src = data;
                imagePreview.classList.remove('hidden');
                modalDropZone.querySelector('span').innerText = "Image Selected";
            }));
        }

        // Activity Slider 
        const activityInput = document.getElementById('activity');
        const activityLabel = document.getElementById('activityLabel');
        // slider  0.8 to 1.2 with 0.1 step.
        const activityLevels = { 
            "0.8": "Very Low", 
            "0.9": "Low", 
            "1": "Normal", 
            "1.1": "High", 
            "1.2": "Very High" 
        };

        if (activityInput && activityLabel) {
            activityInput.oninput = () => {
                // Handle strings lmchmriglin  
                const val = parseFloat(activityInput.value).toString();
                activityLabel.innerText = activityLevels[val] || "Normal";
            };
        }

        memberForm.onsubmit = async (e) => {
            e.preventDefault();
            const rawVal = activityInput ? parseFloat(activityInput.value).toString() : "1";
            const multiplier = parseFloat(rawVal) || 1.0;
            const activityDesc = activityLevels[rawVal] || "Normal";
            
            const w = parseFloat(document.getElementById('height').value) || 0;
            const a = parseFloat(document.getElementById('age').value) || 0;
            
            let T = 25;
            try {
                const tempResponse = await fetch("https://ifest2026-default-rtdb.europe-west1.firebasedatabase.app/temp.json");
                if (tempResponse.ok) {
                    const tempVal = await tempResponse.json();
                    if (tempVal !== null && !isNaN(parseFloat(tempVal))) {
                        T = parseFloat(tempVal);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch temp from Firebase, using default 25.", err);
            }

            const target = calculateQWater(w, a, multiplier, T);

            const newMemberId = document.getElementById('name').value.trim();
            const newMember = {
                id: newMemberId,
                name: newMemberId,
                age: a,
                weight: w,
                activity: activityDesc,
                multiplier: multiplier,
                image: currentImageData,
                current: 0,
                target: target
            };
            
            // Check for duplicate names/IDs
            if (members.find(m => String(m.id).toLowerCase() === newMemberId.toLowerCase())) {
                showMessage("⚠️ A member with this name already exists!", "red");
                return;
            }

            members.push(newMember);
            saveMembers();
            addMemberCard(newMember);
            updateGlobalStats(); // Update totals
            memberForm.reset();
            if (activityLabel) activityLabel.innerText = "Normal";
            memberModal.style.display = "none";
        };
    }

    if (resetAllBtn && resetConfirmModal) {
        // Show the custom modal instead of native confirm()
        resetAllBtn.addEventListener('click', () => {
            resetConfirmModal.style.display = 'block';
        });

        // Hide modal on cancel
        cancelResetBtn.addEventListener('click', () => {
            resetConfirmModal.style.display = 'none';
        });

        // Perform reset on confirmation
        confirmResetBtn.addEventListener('click', () => {
            resetConfirmModal.style.display = 'none'; // Hide modal first
            
            // Reset all members
            members.forEach(m => m.current = 0);
            
            // Reset unknown/unallocated water
            unallocatedWater = 0;
            localStorage.setItem('aquaTrackUnallocatedWater', 0);
            
            // Save and update UI
            saveMembers();
            renderMembers();
            updateGlobalStats();
            
            // Show confirmation
            showMessage("💧 All water intakes have been reset to 0L", "green");
        });

        // Close modal if clicking outside of it
        window.addEventListener('click', (e) => {
            if (e.target == resetConfirmModal) {
                resetConfirmModal.style.display = 'none';
            }
        });
    }

    // --- CORE FUNCTIONS ---

    function calculateQWater(W, A, F_a, T = 25) {
        // Formula: Q_water_m = (0.03*W + 0.005*A)*F_a + (50 + 0.5*MIN(A;40)) * (1 + 0.01*(T-20)) + (20 + 0.1*W**0.75)
        const q_water_m = (0.03 * W + 0.005 * A) * F_a + (50 + 0.5 * Math.min(A, 40)) * (1 + 0.01 * (T - 20)) + (20 + 0.1 * Math.pow(W, 0.75));
        return Math.round(q_water_m * 10) / 10;
    }

    function renderMembers() {
        if (!membersList) return;
        const cards = membersList.querySelectorAll('.member-card');
        cards.forEach(card => card.remove());
        members.forEach(member => addMemberCard(member));
    }

    function addMemberCard(data) {
        if (!membersList) return;
        const isVertical = membersList.classList.contains('members-container');
        const card = document.createElement('div');
        card.className = 'member-card';
        card.dataset.id = data.id;

        if (isVertical) {
            // Vertical card (Settings)
            const avatarContent = data.image
                ? `<img src="${data.image}" alt="${data.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
                : `<i class="fas fa-user"></i>`;

            card.innerHTML = `
                <div class="delete-btn" title="Delete member"><i class="fas fa-times"></i></div>
                <div class="member-avatar cursor-pointer" style="cursor: pointer" title="Click to change photo">${avatarContent}</div>
                <div class="member-details">
                    <div class="detail-row"><span class="label">Name:</span><span class="value">${data.name}</span></div>
                    <div class="detail-row"><span class="label">Age:</span><span class="value">${data.age}</span></div>
                    <div class="detail-row"><span class="label">Weight:</span><span class="value">${data.weight || data.height}kg</span></div>
                    <div class="detail-row"><span class="label">Goal:</span><span class="value">${data.target}L</span></div>
                </div>
            `;

            card.querySelector('.member-avatar').onclick = () => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) handleImageFile(file, (dataUrl) => {
                        data.image = dataUrl; saveMembers();
                        card.querySelector('.member-avatar').innerHTML = `<img src="${dataUrl}" alt="${data.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    });
                };
                input.click();
            };

            card.querySelector('.delete-btn').onclick = (e) => {
                e.stopPropagation();
                // Update global members array
                members = members.filter(m => String(m.id) !== String(data.id));
                saveMembers();
                card.remove();
                updateGlobalStats(); // Recalculate everything
            };

            membersList.insertBefore(card, openModalBtn);
        } else {
            // Horizontal card (Main)
            const target = parseFloat(data.target) || 100;
            const current = parseFloat(data.current) || 0;
            const percent = Math.round((current / target) * 100);
            
            const avatarContent = data.image
                ? `<img src="${data.image}" alt="${data.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
                : `<i class="fas fa-user"></i>`;

            const overLimit = percent > 100;
            const barColor = overLimit ? '#ff4d4d' : '#00d2ff';

            card.innerHTML = `
                <div class="avatar-container">${avatarContent}</div>
                <div class="member-info">
                    <div class="name-row">
                        <span class="name">${data.name}</span>
                        <span class="fraction">${current}L / ${target}L</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill ${overLimit ? 'full' : ''}" 
                             style="width: 0%; background-color: ${barColor};">
                        </div>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const fill = card.querySelector('.progress-bar-fill');
                if (fill) {
                    fill.style.width = `${Math.min(100, percent)}%`;
                }
            }, 300);
            membersList.appendChild(card);
        }
    }

    function updateMainDisplay(current, target, percent) {
        if (!mainPercentage) return;
        let start = 0;
        const duration = 1500;
        const startTime = performance.now();

        function animate(time) {
            let timeFraction = (time - startTime) / duration;
            if (timeFraction > 1) timeFraction = 1;
            const nowPercent = Math.min(100, Math.floor(start + (percent - start) * timeFraction));
            const nowVolume = Math.round((current * timeFraction) * 10) / 10;
            const targetVolume = Math.round(target * 10) / 10;
            
            mainPercentage.innerText = `${nowPercent}%`;
            volumeText.innerText = `${nowVolume}L / ${targetVolume}L`;
            liquid.style.height = `${nowPercent - 10}%`;
            if (nowPercent >= 100) { liquid.classList.add('full'); liquid.style.backgroundColor = '#ff4d4d'; }
            else { liquid.classList.remove('full'); }
            if (timeFraction < 1) requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    }

    // --- ******h ---
    function saveMembers() { localStorage.setItem('aquaTrackMembers', JSON.stringify(members)); }
    function saveMainProfileImage(data) { localStorage.setItem('aquaTrackMainImage', data); updateMainProfileUI(data); }
    function updateMainProfileUI(data) { if (mainDropZone) mainDropZone.innerHTML = `<img src="${data}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`; }
    function handleImageFile(file, callback) { if (!file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = (e) => callback(e.target.result); reader.readAsDataURL(file); }
    function resetImageUpload() {
        currentImageData = null;
        if (imagePreview) imagePreview.classList.add('hidden');
        if (previewImg) previewImg.src = "";
        if (modalDropZone) {
            const span = modalDropZone.querySelector('span');
            if (span) span.innerText = "Drag a picture or Click to Select";
        }
        if (memberImageInput) memberImageInput.value = "";
    }

    function setupDragDrop(zone, callback) {
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('dragover'); const file = e.dataTransfer.files[0]; if (file) callback(file); });
    }

    function showMessage(text, color = "#222", duration = 3000) {
        const box = document.getElementById("messageBox");
        if (!box) return;
        box.innerHTML = text.replace(/\n/g, '<br>'); 
        box.style.background = color; 
        box.style.display = "block";
        setTimeout(() => box.style.display = "none", duration);
    }

    // --- FIREBASE SYNC ---

    async function syncConsumption() {
        try {
            const response = await fetch(databaseURL);
            if (!response.ok) throw new Error("Sync failed");
            const data = await response.json();
            // Ensure Firebase structured data is valid
            if (!data || data.value === undefined) return;

            // LEAK WARNING: If name is an empty string
            if (data.name === "") {
                const leakValue = parseFloat(data.value);
                if (!isNaN(leakValue) && leakValue > 0) {
                    const leakMsg = `⚠️ Warning Notice\n\nThere is a leak in the water installation.\nPlease check and fix it as soon as possible to avoid any damage or water loss.`;
                    showMessage(leakMsg, "#e74c3c", 8000); // Red background, stays for 8 seconds

                    console.warn(`[Leak Warning] ${leakValue}L lost without a known source.`);

                    // Reset value in Firebase so it doesn't repeatedly show the leak
                    await fetch(databaseURL, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ value: 0 })
                    });
                }
                return; // Stop processing
            }

            if (!data.name) return;

            const fetchedName = String(data.name).trim().toLowerCase(); 
            const addedValue = parseFloat(data.value);
            
            if (isNaN(addedValue) || addedValue <= 0 || fetchedName === "") return;

            console.group(`[Sync] Incoming Data for: "${fetchedName}"`);
            console.log(`Value to add: ${addedValue}L`);

            let matchFound = false;
            // Update the members array by mapping
            const nextMembers = members.map(member => {
                const memberId = String(member.id || "").trim().toLowerCase();
                const memberName = String(member.name || "").trim().toLowerCase();

                // Match against ID or Name to be extra safe
                if (memberId === fetchedName || memberName === fetchedName) {
                    console.log(`✅ MATCH! Updating: ${member.name} (ID: ${member.id})`);
                    console.log(`Current: ${member.current}L -> New: ${Math.round((parseFloat(member.current || 0) + addedValue) * 10) / 10}L`);
                    
                    member.current = Math.round((parseFloat(member.current || 0) + addedValue) * 10) / 10;
                    matchFound = true;
                }
                return member;
            });

            if (matchFound) {
                members = nextMembers; // Atomically update the global state
                saveMembers();
                renderMembers();
                updateGlobalStats();

                // Reset the value in Firebase
                console.log(`Resetting Firebase value to 0 for: ${data.name}`);
                await fetch(databaseURL, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: 0 })
                });
            } else {
                console.log(`❌ NO MATCH: Found no member named "${fetchedName}" in local group.`);
                
                // Add to unallocated global water
                unallocatedWater = Math.round((unallocatedWater + addedValue) * 10) / 10;
                localStorage.setItem('aquaTrackUnallocatedWater', unallocatedWater);
                
                // Update the big circle to reflect the new total
                updateGlobalStats();
                
                // Show an alert to the user
                showMessage(`⚠️ Received ${addedValue}L from unknown member "${data.name}". Added to global total.`, "orange");
                
                // Reset the value in Firebase so it doesn't keep adding the unknown water
                await fetch(databaseURL, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: 0 })
                });
            }
            console.groupEnd();
        } catch (error) {
            console.error("Consumption Sync Error:", error);
        }
    }

    // Start periodic sync every 10 seconds
    setInterval(syncConsumption, 10000);
    // Initial sync
    syncConsumption();
});
