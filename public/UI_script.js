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

    // --- STATE ---
    let currentImageData = null;
    let members = JSON.parse(localStorage.getItem('aquaTrackMembers')) || [];
    let mainProfileImage = localStorage.getItem('aquaTrackMainImage');
    let familyName = localStorage.getItem('aquaTrackFamilyName') || "Family - Name";

    // --- INITIALIZATION ---
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
        const totalGoal = members.reduce((sum, m) => sum + (parseFloat(m.target) || 0), 0) || 0;
        const totalIntake = members.reduce((sum, m) => sum + (parseFloat(m.current) || 0), 0);
        const globalPercentage = totalGoal > 0 ? Math.round((totalIntake / totalGoal) * 100) : 0;

        setTimeout(() => {
            updateMainDisplay(totalIntake, totalGoal, globalPercentage);
        }, 500);
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

        memberForm.onsubmit = (e) => {
            e.preventDefault();
            const rawVal = activityInput ? parseFloat(activityInput.value).toString() : "1";
            const multiplier = parseFloat(rawVal) || 1.0;
            const activityDesc = activityLevels[rawVal] || "Normal";
            
            const w = parseFloat(document.getElementById('height').value) || 0;
            const a = parseFloat(document.getElementById('age').value) || 0;
            const target = calculateQWater(w, a, multiplier);

            const newMember = {
                id: Date.now(),
                name: document.getElementById('name').value,
                age: a,
                weight: w,
                activity: activityDesc,
                multiplier: multiplier,
                image: currentImageData,
                current: 0,
                target: target
            };
            members.push(newMember);
            saveMembers();
            addMemberCard(newMember);
            memberForm.reset();
            if (activityLabel) activityLabel.innerText = "Normal";
            memberModal.style.display = "none";
        };
    }

    // --- CORE FUNCTIONS ---

    function calculateQWater(W, A, F_a, T = 25) {
        // Formula: Q_water_m = (0.03*W + 0.005*A)*F_a + (50 + 0.5*MIN(A;40)) * (1 + 0.01*(T-20)) + (20 + 0.1*SQRT(W))
        const q_water_m = (0.03 * W + 0.005 * A) * F_a + (50 + 0.5 * Math.min(A, 40)) * (1 + 0.01 * (T - 20)) + (20 + 0.1 * Math.sqrt(W));
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
                if (confirm(`Delete ${data.name}?`)) {
                    members = members.filter(m => m.id !== data.id);
                    saveMembers(); card.remove();
                }
            };

            membersList.insertBefore(card, openModalBtn);
        } else {
            // Horizontal card (Main)
            const target = data.target || 100;
            const current = data.current || 0;
            const percent = Math.round((current / target) * 100);
            
            const avatarContent = data.image
                ? `<img src="${data.image}" alt="${data.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
                : `<i class="fas fa-user"></i>`;

            card.innerHTML = `
                <div class="avatar-container">${avatarContent}</div>
                <div class="member-info">
                    <div class="name-row">
                        <span class="name">${data.name}</span>
                        <span class="fraction">${current}L / ${target}L</span>
                    </div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 0%"></div></div>
                </div>
            `;


            setTimeout(() => {
                if (card.querySelector('.progress-bar-fill')) {
                    card.querySelector('.progress-bar-fill').style.width = `${percent}%`;
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

    function showMessage(text, color = "#222") {
        const box = document.getElementById("messageBox");
        if (!box) return;
        box.textContent = text; box.style.background = color; box.style.display = "block";
        setTimeout(() => box.style.display = "none", 3000);
    }
});
