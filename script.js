let students = [];
let constraints = [];
let unavailableSeats = new Set();
let fixedSeats = {};
let isReversed = false;
let selectedSeatIndex = null;

// [추가] 페이지 로드 시 데이터 복원
window.addEventListener('DOMContentLoaded', () => {
    loadData();
});

// [추가] 로컬 스토리지에 데이터 저장
function saveData() {
    const data = {
        students: students,
        constraints: constraints,
        unavailableSeats: Array.from(unavailableSeats),
        fixedSeats: fixedSeats,
        isReversed: isReversed,
        rows: document.getElementById('rows').value,
        cols: document.getElementById('cols').value,
        pairMode: document.getElementById('pairMode').checked
    };
    localStorage.setItem('smartSeatData', JSON.stringify(data));
}

// [추가] 데이터 불러오기
function loadData() {
    const saved = localStorage.getItem('smartSeatData');
    if (!saved) {
        generateMap(); // 저장된 데이터가 없으면 기본 맵 생성
        return;
    }

    const data = JSON.parse(saved);
    students = data.students || [];
    constraints = data.constraints || [];
    unavailableSeats = new Set(data.unavailableSeats || []);
    fixedSeats = data.fixedSeats || {};
    isReversed = data.isReversed || false;

    // UI 복구
    document.getElementById('rows').value = data.rows || 5;
    document.getElementById('cols').value = data.cols || 6;
    document.getElementById('pairMode').checked = data.pairMode || false;
    document.getElementById('reverseLayout').checked = isReversed;

    renderStudents();
    renderConstraints();
    toggleLayout();
    generateMap(true); // true 인자를 넘겨 초기화 방지
}

// 관리자 비밀번호 로직
document.getElementById('adminTrigger').addEventListener('click', () => {
    const adminSection = document.getElementById('adminSection');
    const password = prompt("관리자 비밀번호를 입력하세요.");
    if (password === "191113") {
        const isVisible = adminSection.style.display === "block";
        adminSection.style.display = isVisible ? "none" : "block";
        if (!isVisible) adminSection.scrollIntoView({ behavior: 'smooth' });
    } else if (password !== null) {
        alert("비밀번호가 틀렸습니다.");
    }
});

function toggleLayout() {
    isReversed = document.getElementById('reverseLayout').checked;
    const wrapper = document.getElementById('mainDeskWrapper');
    isReversed ? wrapper.classList.add('reversed') : wrapper.classList.remove('reversed');
    saveData();
}

function addStudent() {
    const input = document.getElementById('studentName');
    const pref = document.getElementById('preference').value;
    const value = input.value.trim();
    if (!value) return;

    const rangeMatch = value.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            pushStudent(i.toString(), pref);
        }
    } else {
        pushStudent(value, pref);
    }
    renderStudents();
    saveData();
    input.value = '';
    input.focus();
}

function pushStudent(name, pref) {
    if (!students.find(s => s.name === name)) students.push({ name, pref });
}

function renderStudents() {
    const list = document.getElementById('studentList');
    list.innerHTML = students.map((s, i) => `
        <li class="${s.pref}-pref-item">
            <span><strong>${s.name}</strong></span>
            <div style="display: flex; align-items: center; gap: 10px;">
                <select class="list-pref-select" onchange="updatePreference(${i}, this.value)">
                    <option value="none" ${s.pref === 'none' ? 'selected' : ''}>일반</option>
                    <option value="front" ${s.pref === 'front' ? 'selected' : ''}>앞자리</option>
                    <option value="back" ${s.pref === 'back' ? 'selected' : ''}>뒷자리</option>
                </select>
                <button onclick="students.splice(${i}, 1); renderStudents(); saveData();" style="background:#f02849; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">삭제</button>
            </div>
        </li>
    `).join('');
}

function updatePreference(index, newPref) {
    students[index].pref = newPref;
    renderStudents();
    saveData();
}

function clearStudents() {
    if (confirm("학생 명단을 초기화하시겠습니까?")) {
        students = [];
        renderStudents();
        saveData();
    }
}

function generateMap(isLoad = false) {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const isPair = document.getElementById('pairMode').checked;
    const container = document.getElementById('deskMapContainer');
    
    container.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    isPair ? container.classList.add('pair-active') : container.classList.remove('pair-active');
    
    container.innerHTML = '';
    
    // 버튼 직접 클릭 시에만 데이터 초기화
    if (!isLoad) {
        unavailableSeats.clear();
        fixedSeats = {};
    }

    for (let i = 0; i < rows * cols; i++) {
        const cell = document.createElement('div');
        cell.className = 'desk-cell';
        
        if (isPair) {
            const colIdx = i % cols;
            if (colIdx % 2 === 1) cell.classList.add('pair-right');
            if (colIdx === cols - 1) cell.classList.add('row-last');
        }

        // 복원된 상태 적용
        if (unavailableSeats.has(i)) {
            cell.classList.add('unavailable');
            cell.innerText = 'X';
        } else if (fixedSeats[i]) {
            cell.classList.add('fixed-seat');
            cell.innerText = fixedSeats[i];
        }

        cell.onclick = () => {
            if (cell.classList.contains('fixed-seat')) return;
            cell.classList.toggle('unavailable');
            if (cell.classList.contains('unavailable')) {
                cell.innerText = 'X';
                unavailableSeats.add(i);
            } else {
                cell.innerText = '';
                unavailableSeats.delete(i);
            }
            saveData();
        };

        cell.ondblclick = () => {
            if (cell.classList.contains('unavailable')) return;
            const name = prompt("고정할 학생 이름:", fixedSeats[i] || "");
            if (name) { 
                fixedSeats[i] = name; 
                cell.classList.add('fixed-seat'); 
                cell.innerText = name; 
            } else { 
                delete fixedSeats[i]; 
                cell.classList.remove('fixed-seat'); 
                cell.innerText = ''; 
            }
            saveData();
        };
        container.appendChild(cell);
    }
    if (!isLoad) saveData();
}

function addConstraint(type) {
    const p1 = document.getElementById('pair1').value.trim();
    const p2 = document.getElementById('pair2').value.trim();
    if (p1 && p2 && p1 !== p2) {
        constraints.push({ type, p1, p2 });
        renderConstraints();
        saveData();
        document.getElementById('pair1').value = '';
        document.getElementById('pair2').value = '';
    }
}

function renderConstraints() {
    document.getElementById('constraintList').innerHTML = constraints.map((c, i) => `
        <li>[${c.type === 'buddy' ? '친함' : '안친함'}] ${c.p1}-${c.p2} 
        <button onclick="constraints.splice(${i},1); renderConstraints(); saveData();" style="background:#f02849; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">삭제</button></li>
    `).join('');
}

const shuffle = (array) => array.sort(() => Math.random() - 0.5);

function startShuffle() {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const totalSeats = rows * cols;
    let maxAttempts = 5000;
    let finalLayout = null;

    if (students.length === 0) { alert("학생을 등록하세요!"); return; }

    while (maxAttempts > 0) {
        maxAttempts--;
        let tempLayout = new Array(totalSeats).fill(null);
        for (let idx in fixedSeats) tempLayout[idx] = fixedSeats[idx];

        let availableIndices = [];
        for (let i = 0; i < totalSeats; i++) {
            if (!unavailableSeats.has(i) && tempLayout[i] === null) availableIndices.push(i);
        }

        let leftStudents = students.filter(s => !Object.values(fixedSeats).includes(s.name));
        if (leftStudents.length > availableIndices.length) { alert("자리가 부족합니다!"); return; }

        let frontG = shuffle(leftStudents.filter(s => s.pref === 'front'));
        let backG = shuffle(leftStudents.filter(s => s.pref === 'back'));
        let normalG = shuffle(leftStudents.filter(s => s.pref === 'none'));

        let success = true;

        let frontZone = shuffle(availableIndices.filter(idx => Math.floor(idx / cols) === 0));
        for (let s of frontG) {
            let targetIdx = frontZone.pop() || availableIndices.find(idx => tempLayout[idx] === null);
            if (targetIdx !== undefined) {
                tempLayout[targetIdx] = s.name;
                availableIndices = availableIndices.filter(idx => idx !== targetIdx);
            } else success = false;
        }

        let backZone = shuffle(availableIndices.filter(idx => Math.floor(idx / cols) === rows - 1));
        for (let s of backG) {
            let targetIdx = backZone.pop() || [...availableIndices].reverse().find(idx => tempLayout[idx] === null);
            if (targetIdx !== undefined) {
                tempLayout[targetIdx] = s.name;
                availableIndices = availableIndices.filter(idx => idx !== targetIdx);
            } else success = false;
        }

        let remainingIndices = shuffle([...availableIndices]);
        for (let s of normalG) {
            let targetIdx = remainingIndices.pop();
            if (targetIdx !== undefined) tempLayout[targetIdx] = s.name;
            else success = false;
        }

        if (success && checkConstraints(tempLayout, rows, cols)) {
            finalLayout = tempLayout;
            break;
        }
    }

    if (finalLayout) renderFinal(finalLayout, rows, cols);
    else alert("조건에 맞는 배치를 찾지 못했습니다. 제약 조건을 줄여보세요.");
}

function checkConstraints(layout, rows, cols) {
    for (let c of constraints) {
        const i1 = layout.indexOf(c.p1);
        const i2 = layout.indexOf(c.p2);
        if (i1 === -1 || i2 === -1) continue;
        const r1 = Math.floor(i1/cols), c1 = i1%cols, r2 = Math.floor(i2/cols), c2 = i2%cols;
        const isNear = Math.abs(r1-r2) <= 1 && Math.abs(c1-c2) <= 1;
        if (c.type === 'buddy' && !isNear) return false;
        if (c.type === 'enemy' && isNear) return false;
    }
    return true;
}

function renderFinal(layout, rows, cols) {
    const resultSection = document.getElementById('resultSection');
    const isPair = document.getElementById('pairMode').checked;
    resultSection.style.display = 'block';
    
    const wrapper = document.getElementById('captureArea');
    const content = document.getElementById('resultContent');
    
    content.innerHTML = `
        <div class="label board-label">칠 판</div>
        <div class="label aisle-label">복 도</div>
        <div class="label window-label">창 문</div>
        <div id="resultDeskMapContainer" class="grid-layout"></div>
    `;

    if (isReversed) wrapper.classList.add('reversed');
    else wrapper.classList.remove('reversed');

    const container = document.getElementById('resultDeskMapContainer');
    container.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    if (isPair) container.classList.add('pair-active');
    else container.classList.remove('pair-active');
    
    let currentLayout = [...layout];
    selectedSeatIndex = null;

    const redraw = () => {
        container.innerHTML = '';
        currentLayout.forEach((name, i) => {
            const cell = document.createElement('div');
            cell.className = 'desk-cell';
            
            if (isPair) {
                const colIdx = i % cols;
                if (colIdx % 2 === 1) cell.classList.add('pair-right');
                if (colIdx === cols - 1) cell.classList.add('row-last');
            }

            if (unavailableSeats.has(i)) { 
                cell.classList.add('unavailable'); cell.innerText = 'X'; 
            } else {
                cell.innerText = name || '';
                if (name && Object.values(fixedSeats).includes(name)) cell.classList.add('fixed-seat');
                if (selectedSeatIndex === i) {
                    cell.style.borderColor = '#42b72a';
                    cell.style.boxShadow = '0 0 10px rgba(66, 183, 42, 0.5)';
                }
                cell.onclick = () => {
                    if (selectedSeatIndex === null) selectedSeatIndex = i;
                    else {
                        if (selectedSeatIndex !== i) {
                            let temp = currentLayout[i];
                            currentLayout[i] = currentLayout[selectedSeatIndex];
                            currentLayout[selectedSeatIndex] = temp;
                        }
                        selectedSeatIndex = null;
                    }
                    redraw();
                };
                cell.ondblclick = (e) => {
                    e.stopPropagation();
                    const newName = prompt("학생 이름 수정:", name || "");
                    if (newName !== null) { currentLayout[i] = newName; selectedSeatIndex = null; redraw(); }
                };
            }
            container.appendChild(cell);
        });
    };
    redraw();
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

async function saveAsImage() {
    const fileName = prompt("저장할 이미지 파일 이름을 입력하세요:", "좌석배치도");
    if (!fileName) return;

    const element = document.getElementById('captureArea');
    const titleEl = document.getElementById('captureTitle');
    titleEl.innerText = fileName;
    titleEl.style.display = 'block';

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
            useCORS: true
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${fileName}.png`;
        link.click();
    } catch (error) {
        console.error("이미지 저장 중 오류 발생:", error);
        alert("이미지 저장 중 오류가 발생했습니다.");
    } finally {
        titleEl.style.display = 'none';
    }
}

async function saveAsPDF() {
    const fileName = prompt("저장할 PDF 파일 이름을 입력하세요:", "좌석배치도");
    if (!fileName) return;

    const element = document.getElementById('captureArea');
    const titleEl = document.getElementById('captureTitle');
    titleEl.innerText = fileName;
    titleEl.style.display = 'block';

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
            useCORS: true
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
    } catch (error) {
        console.error("PDF 생성 중 오류 발생:", error);
        alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
        titleEl.style.display = 'none';
    }
}
