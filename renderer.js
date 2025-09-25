document.addEventListener('DOMContentLoaded', () => {
    // --- DATA STATE & PERSISTENCE ---
    let tasks = [];
    let editingTaskId = null, currentTaskFiles = [], currentTaskSubtasks = [];
    let selectedPriority = 'medium', selectedStatus = 'todo';
    let currentView = 'dashboard';
    let searchQuery = '';
    let currentDate = new Date();
    let priorityChart = null;
    let statusChart = null;

    const saveTasks = async () => {
        await window.electronAPI.saveTasks(tasks);
    };

    const loadTasks = async () => {
        tasks = await window.electronAPI.getTasks();
        if (!tasks || tasks.length === 0) {
            tasks = [
                { id: 1, title: 'ออกแบบ UI สำหรับหน้า Dashboard', priority: 'high', dueDate: '2025-09-24', status: 'todo', tags: ['#งาน'], files: [], subtasks: [{text: 'Wireframe', done: true}, {text: 'Mockup', done: false}], isArchived: false },
                { id: 2, title: 'ซื้อของเข้าบ้าน', priority: 'medium', dueDate: '2025-09-23', status: 'todo', tags: ['#บ้าน'], files: [], subtasks: [], isArchived: false },
                { id: 3, title: 'จ่ายบิลค่าอินเทอร์เน็ต', priority: 'urgent', dueDate: '2025-09-23', status: 'done', tags: ['#จ่ายบิล'], files: [], subtasks: [], isArchived: true },
            ];
            await saveTasks();
        }
    };

    // --- DOM ELEMENTS ---
    const themeToggle = document.getElementById('theme-toggle');
    const kanbanBoard = document.getElementById('kanban-board');
    const calendarView = document.getElementById('calendar-view');
    const archiveView = document.getElementById('archive-view');
    const dashboardView = document.getElementById('dashboard-view');
    const kanbanContainer = document.getElementById('kanban-container');
    const viewBtns = document.querySelectorAll('.view-btn');
    const searchBox = document.getElementById('search-box');
    const taskModal = document.getElementById('task-modal');
    const subtaskInput = document.getElementById('new-subtask-input');
    const addSubtaskBtn = document.getElementById('add-subtask-btn');
    const subtaskList = document.getElementById('subtask-list');
    const archiveButton = document.getElementById('archive-task-button');
    const addTaskButton = document.getElementById('add-task-button');
    const cancelButton = document.getElementById('cancel-button');
    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title');
    const datePicker = document.getElementById('task-due-date-picker');
    const modalTitle = document.getElementById('modal-title');
    const submitButton = document.getElementById('submit-task-button');
    const deleteButton = document.getElementById('delete-task-button');
    const attachFileButton = document.getElementById('attach-file-button');
    const fileAttachmentList = document.getElementById('file-attachment-list');

    // --- THEME ---
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;

    const updateTheme = () => {
        if (document.documentElement.classList.contains('dark')) {
            themeToggle.innerHTML = sunIcon;
            localStorage.setItem('clarity_theme', 'dark');
        } else {
            themeToggle.innerHTML = moonIcon;
            localStorage.setItem('clarity_theme', 'light');
        }
    };

    // --- DRAG & DROP ---
    const initSortable = () => {
        const columns = document.querySelectorAll('.kanban-tasks-container');
        columns.forEach(column => {
            new Sortable(column, {
                group: 'shared',
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                onEnd: async (evt) => {
                    const taskId = parseInt(evt.item.dataset.id);
                    const newStatus = evt.to.id.replace('-tasks', '');
                    const task = tasks.find(t => t.id === taskId);
                    if (task && task.status !== newStatus) {
                        task.status = newStatus;
                        await saveTasks();
                        render();
                    }
                },
            });
        });
    };

    // --- RENDERING ---
    const render = () => {
        // (แก้ไข) คืนโค้ดจัดการ Active Button เป็นแบบเดิม
        viewBtns.forEach(btn => {
            const isBtnActive = btn.id.startsWith(currentView);
            btn.classList.toggle('bg-white', isBtnActive);
            btn.classList.toggle('dark:bg-gray-800', isBtnActive);
            btn.classList.toggle('shadow', isBtnActive);
        });

        dashboardView.classList.toggle('hidden', currentView !== 'dashboard');
        kanbanContainer.classList.toggle('hidden', currentView !== 'kanban');
        calendarView.classList.toggle('hidden', currentView !== 'calendar');
        archiveView.classList.toggle('hidden', currentView !== 'archive');

        if (currentView === 'dashboard') renderDashboard();
        else if (currentView === 'kanban') renderKanban();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'archive') renderArchive();
    };
    
    const getFilteredTasks = () => {
        return tasks.filter(task =>
            !task.isArchived &&
            task.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };
    
    const renderDashboard = () => {
        const activeTasks = tasks.filter(task => !task.isArchived);
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const completedToday = activeTasks.filter(t => t.status === 'done' && t.dueDate === todayStr).length;
        
        const next7Days = new Date();
        next7Days.setDate(today.getDate() + 7);
        const dueThisWeek = activeTasks.filter(t => {
            if (!t.dueDate || t.status === 'done') return false;
            const dueDate = new Date(t.dueDate);
            return dueDate >= today && dueDate <= next7Days;
        }).length;

        const overdue = activeTasks.filter(t => {
            if (!t.dueDate || t.status === 'done') return false;
            return new Date(t.dueDate) < new Date(todayStr);
        }).length;

        document.getElementById('stat-completed-today').textContent = completedToday;
        document.getElementById('stat-due-week').textContent = dueThisWeek;
        document.getElementById('stat-overdue').textContent = overdue;

        const priorities = { urgent: 0, high: 0, medium: 0, low: 0 };
        const statuses = { todo: 0, inprogress: 0, done: 0 };

        activeTasks.forEach(task => {
            if (priorities[task.priority] !== undefined) priorities[task.priority]++;
            if (statuses[task.status] !== undefined) statuses[task.status]++;
        });

        if(priorityChart) priorityChart.destroy();
        if(statusChart) statusChart.destroy();
        
        drawPriorityChart(priorities);
        drawStatusChart(statuses);
    };

    const drawPriorityChart = (data) => {
        const ctx = document.getElementById('tasks-by-priority-chart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        priorityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['ด่วน', 'สูง', 'ปานกลาง', 'ต่ำ'],
                datasets: [{
                    label: 'Tasks by Priority',
                    data: [data.urgent, data.high, data.medium, data.low],
                    backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#6b7280'],
                    borderColor: isDark ? '#1e2330' : '#ffffff',
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: isDark ? '#e5e7eb' : '#1f2937' } },
                    title: { display: true, text: 'สัดส่วนงานตามความสำคัญ', color: isDark ? '#e5e7eb' : '#1f2937', font: { size: 16, family: 'Sarabun' } }
                }
            }
        });
    };

    const drawStatusChart = (data) => {
        const ctx = document.getElementById('tasks-by-status-chart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        statusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['สิ่งที่ต้องทำ', 'กำลังทำ', 'เสร็จแล้ว'],
                datasets: [{
                    label: 'จำนวนงาน',
                    data: [data.todo, data.inprogress, data.done],
                    backgroundColor: ['#a0aec0', '#f59e0b', '#22c55e'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { ticks: { color: isDark ? '#9ca3af' : '#6b7280', stepSize: 1 } },
                    x: { ticks: { color: isDark ? '#9ca3af' : '#6b7280' } }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'ภาพรวมสถานะงานทั้งหมด', color: isDark ? '#e5e7eb' : '#1f2937', font: { size: 16, family: 'Sarabun' } }
                }
            }
        });
    }

    const renderKanban = () => {
        kanbanBoard.innerHTML = '';
        const statuses = [
            { id: 'todo', title: 'สิ่งที่ต้องทำ', color: 'text-gray-700 dark:text-gray-300' },
            { id: 'inprogress', title: 'กำลังทำ', color: 'text-yellow-700 dark:text-yellow-400' },
            { id: 'done', title: 'เสร็จแล้ว', color: 'text-green-700 dark:text-green-400' }
        ];
        const filteredTasks = getFilteredTasks();
        statuses.forEach(status => {
            const column = document.createElement('div');
            column.className = 'kanban-column';
            column.innerHTML = `<h2 class="text-xl font-bold ${status.color} mb-4 px-2">${status.title}</h2><div id="${status.id}-tasks" class="kanban-tasks-container space-y-4"></div>`;
            kanbanBoard.appendChild(column);
            const container = document.getElementById(`${status.id}-tasks`);
            const tasksInStatus = filteredTasks.filter(t => t.status === status.id);
            tasksInStatus.forEach(task => container.appendChild(createTaskCard(task)));
        });
        initSortable();
    };

    const renderCalendar = () => {
        calendarView.innerHTML = '';
        const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
        
        let header = `<div class="flex justify-between items-center text-center mb-4"><button id="prev-month" class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">&lt;</button><h2 class="text-2xl font-bold">${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}</h2><button id="next-month" class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">&gt;</button></div>`;
        let dayHeaders = `<div id="calendar-grid" class="grid grid-cols-7 gap-1">` + dayNames.map(d => `<div class="font-bold text-center text-gray-500 p-2">${d}</div>`).join('');

        let firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        let daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        let gridHTML = '';

        for(let i = 0; i < firstDay; i++) gridHTML += `<div class="border rounded-lg dark:border-gray-700"></div>`;
        
        for(let day = 1; day <= daysInMonth; day++) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            const dayDate = `${year}-${month}-${date}`;

            const dayTasks = getFilteredTasks().filter(t => t.dueDate === dayDate);
            const today = new Date();
            const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
            const todayClass = isToday ? 'bg-blue-500 text-white rounded-full' : '';

            gridHTML += `<div class="calendar-day border dark:border-gray-700 rounded-lg p-2 flex flex-col">
                            <div class="flex justify-center"><span class="font-bold w-8 h-8 flex items-center justify-center ${todayClass}">${day}</span></div>
                            <div class="mt-1 space-y-1 flex-grow overflow-y-auto">
                            ${dayTasks.map(t => `<div data-id="${t.id}" class="task-card calendar-task bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded truncate p-1">${t.title}</div>`).join('')}
                            </div>
                         </div>`;
        }
        
        let totalCells = firstDay + daysInMonth;
        while(totalCells % 7 !== 0) {
            gridHTML += `<div class="border rounded-lg dark:border-gray-700"></div>`;
            totalCells++;
        }

        calendarView.innerHTML = header + dayHeaders + gridHTML + `</div>`;
    };

    const renderArchive = () => {
        const archivedTasks = tasks.filter(task => task.isArchived && task.title.toLowerCase().includes(searchQuery.toLowerCase()));

        if (archivedTasks.length === 0) {
            archiveView.innerHTML = `<p class="text-center text-gray-500 mt-8">ไม่มีงานที่เก็บไว้</p>`;
            return;
        }

        const list = document.createElement('div');
        list.className = 'space-y-4';
        archivedTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'glass-card rounded-xl p-4 flex justify-between items-center';
            item.innerHTML = `
                <div>
                    <p class="font-semibold text-lg line-through text-gray-500">${task.title}</p>
                    <p class="text-sm text-gray-400">Archived</p>
                </div>
                <button data-id="${task.id}" class="unarchive-btn px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold">นำกลับ</button>
            `;
            list.appendChild(item);
        });
        archiveView.innerHTML = `<div class="space-y-4">${list.innerHTML}</div>`;
    };

    const createTaskCard = (task) => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card glass-card rounded-xl p-4 space-y-3`;
        if (task.status === 'done') {
    taskCard.classList.add('done');
        }
        taskCard.dataset.id = task.id;
        const priorityClasses = {
            low:    { bg: 'bg-gray-100 dark:bg-gray-600', text: 'text-gray-700 dark:text-gray-100' },
            medium: { bg: 'bg-blue-100 dark:bg-blue-800', text: 'text-blue-700 dark:text-blue-100' },
            high:   { bg: 'bg-orange-100 dark:bg-orange-800', text: 'text-orange-700 dark:text-orange-100' },
            urgent: { bg: 'bg-red-100 dark:bg-red-800', text: 'text-red-700 dark:text-red-100' }
        }[task.priority] || {bg: 'bg-gray-100', text: 'text-gray-700'};
        const formattedDueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';
        const subtaskProgress = task.subtasks && task.subtasks.length > 0 ? `<div class="flex items-center gap-1 text-sm text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fill-rule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clip-rule="evenodd" /></svg><span>${task.subtasks.filter(st => st.done).length}/${task.subtasks.length}</span></div>` : '';

        taskCard.innerHTML = `
            <div class="flex justify-between items-start">
                <p class="task-title font-semibold pr-2">${task.title}</p>
                <span class="text-xs font-bold px-2 py-1 rounded-md ${priorityClasses.bg} ${priorityClasses.text}">${task.priority}</span>
            </div>
            <div class="flex justify-between items-center">
                <div class="flex gap-2">
                    ${task.tags ? task.tags.map(tag => `<span class="text-xs text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-200">${tag}</span>`).join('') : ''}
                </div>
                <div class="flex items-center gap-3">
                    ${subtaskProgress}
                    ${task.files && task.files.length > 0 ? `<div class="flex items-center gap-1 text-sm text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 00-3-3H8zm-1 9a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg><span>${task.files.length}</span></div>` : ''}
                    ${formattedDueDate ? `<div class="flex items-center gap-1 text-sm text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>${formattedDueDate}</span></div>` : ''}
                </div>
            </div>
        `;
        return taskCard;
    };

    const showModal = (taskId = null) => {
        resetForm();
        editingTaskId = taskId;
        if (taskId) {
            const task = tasks.find(t => t.id === taskId);
            modalTitle.textContent = "แก้ไข Task";
            submitButton.textContent = "บันทึก";
            deleteButton.classList.remove('hidden');
            archiveButton.classList.remove('hidden');
            archiveButton.textContent = task.isArchived ? "นำกลับ" : "เก็บ";
            taskTitleInput.value = task.title;
            datePicker.value = task.dueDate;
            setSelectedButton('.priority-btn', task.priority);
            setSelectedButton('.status-btn', task.status);
            selectedPriority = task.priority;
            selectedStatus = task.status;
            currentTaskFiles = [...(task.files || [])];
            currentTaskSubtasks = JSON.parse(JSON.stringify(task.subtasks || []));
            renderFileList();
            renderSubtaskList();
        } else {
            modalTitle.textContent = "สร้าง Task ใหม่";
            submitButton.textContent = "เพิ่ม Task";
            deleteButton.classList.add('hidden');
            archiveButton.classList.add('hidden');
        }
        taskModal.classList.remove('modal-hidden');
        taskModal.classList.add('modal-visible');
    };

    const hideModal = () => {
        taskModal.classList.add('modal-hidden');
        taskModal.classList.remove('modal-visible');
    };

    const resetForm = () => {
        taskForm.reset();
        editingTaskId = null;
        currentTaskFiles = [];
        currentTaskSubtasks = [];
        renderFileList();
        renderSubtaskList();
        setSelectedButton('.priority-btn', 'medium');
        setSelectedButton('.status-btn', 'todo');
        selectedPriority = 'medium';
        selectedStatus = 'todo';
    };

    const setSelectedButton = (selector, value) => {
        document.querySelectorAll(selector).forEach(b => {
            b.classList.remove('bg-blue-500', 'text-white');
            b.classList.add('bg-gray-200/80');
            if(b.dataset[selector.includes('priority') ? 'priority' : 'status'] === value) {
                b.classList.add('bg-blue-500', 'text-white');
                b.classList.remove('bg-gray-200/80');
            }
        });
    };
    
    const renderFileList = () => {
        fileAttachmentList.innerHTML = '';
        currentTaskFiles.forEach((file) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex justify-between items-center bg-gray-100/80 dark:bg-gray-700/80 p-2 rounded-lg';
            fileItem.innerHTML = `<span class="file-link text-sm truncate pr-2" data-path="${file.path}">${file.name}</span>
                <button type="button" data-path="${file.path}" class="remove-file-btn text-red-500 font-bold text-lg">&times;</button>`;
            fileAttachmentList.appendChild(fileItem);
        });
    };
    
    const renderSubtaskList = () => {
        subtaskList.innerHTML = '';
        currentTaskSubtasks.forEach((subtask, index) => {
            const subtaskItem = document.createElement('div');
            subtaskItem.className = 'flex items-center gap-2';
            subtaskItem.innerHTML = `
                <input type="checkbox" id="subtask-${index}" data-index="${index}" class="subtask-checkbox h-5 w-5 rounded text-blue-500 focus:ring-blue-500 border-gray-300" ${subtask.done ? 'checked' : ''}>
                <input type="text" value="${subtask.text}" data-index="${index}" class="subtask-text-input w-full bg-transparent border-none p-1 rounded ${subtask.done ? 'line-through text-gray-500' : ''}">
                <button type="button" data-index="${index}" class="remove-subtask-btn text-red-500 font-bold text-lg">&times;</button>
            `;
            subtaskList.appendChild(subtaskItem);
        });
    };

    // --- EVENT LISTENERS ---
    viewBtns.forEach(btn => btn.addEventListener('click', () => {
        currentView = btn.id.replace('-view-btn', '');
        render();
    }));
    
    searchBox.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
    });

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        updateTheme();
        render();
    });
    
    addTaskButton.addEventListener('click', () => showModal());
    
    document.getElementById('main-content').addEventListener('click', e => {
        const taskCard = e.target.closest('.task-card');
        if (taskCard) {
            showModal(parseInt(taskCard.dataset.id));
        }
    });

    cancelButton.addEventListener('click', hideModal);
    taskModal.addEventListener('click', e => { if (e.target === taskModal) hideModal(); });
    
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        if (!title) return;
        
        const taskData = {
            title,
            priority: selectedPriority,
            dueDate: datePicker.value,
            status: selectedStatus,
            files: [...currentTaskFiles],
            subtasks: [...currentTaskSubtasks]
        };

        if (editingTaskId) {
            const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
            tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
        } else {
            tasks.push({ id: Date.now(), ...taskData, tags: ['#ใหม่'], isArchived: false });
        }
        await saveTasks();
        render();
        hideModal();
    });

    deleteButton.addEventListener('click', async () => {
        if (editingTaskId && confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ Task นี้?')) {
            const taskToDelete = tasks.find(t => t.id === editingTaskId);
            if (taskToDelete && taskToDelete.files) {
                for (const file of taskToDelete.files) {
                    await window.electronAPI.deleteFile(file.path);
                }
            }
            tasks = tasks.filter(t => t.id !== editingTaskId);
            await saveTasks();
            render();
            hideModal();
        }
    });

    archiveButton.addEventListener('click', async () => {
        if (editingTaskId) {
            const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
            tasks[taskIndex].isArchived = !tasks[taskIndex].isArchived;
            await saveTasks();
            render();
            hideModal();
        }
    });

    attachFileButton.addEventListener('click', async () => {
        const result = await window.electronAPI.openFileDialog();
        if(result){
            currentTaskFiles.push(result);
            renderFileList();
        }
    });

    fileAttachmentList.addEventListener('click', async (e) => {
        if(e.target.classList.contains('remove-file-btn')) {
            const pathToRemove = e.target.dataset.path;
            const success = await window.electronAPI.deleteFile(pathToRemove);
            if (success) {
                currentTaskFiles = currentTaskFiles.filter(file => file.path !== pathToRemove);
                renderFileList();
            } else {
                alert('Could not delete the file from storage.');
            }
        }
        if(e.target.classList.contains('file-link')) {
            const path = e.target.dataset.path;
            window.electronAPI.openFile(path);
        }
    });
    
    addSubtaskBtn.addEventListener('click', () => {
        const text = subtaskInput.value.trim();
        if(text) {
            currentTaskSubtasks.push({ text, done: false });
            renderSubtaskList();
            subtaskInput.value = '';
        }
    });

    subtaskList.addEventListener('click', e => {
        const index = parseInt(e.target.dataset.index);
        if(e.target.classList.contains('remove-subtask-btn')) {
            currentTaskSubtasks.splice(index, 1);
            renderSubtaskList();
        }
        if(e.target.classList.contains('subtask-checkbox')) {
            currentTaskSubtasks[index].done = e.target.checked;
            renderSubtaskList();
        }
    });
    subtaskList.addEventListener('input', e => {
         if(e.target.classList.contains('subtask-text-input')) {
            const index = parseInt(e.target.dataset.index);
            currentTaskSubtasks[index].text = e.target.value;
        }
    });

    calendarView.addEventListener('click', e => {
        if(e.target.closest('#prev-month')){
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        }
        if(e.target.closest('#next-month')){
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        }
    });
    
    archiveView.addEventListener('click', async (e) => {
        if (e.target.classList.contains('unarchive-btn')) {
            const taskId = parseInt(e.target.dataset.id);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.isArchived = false;
                await saveTasks();
                render();
            }
        }
    });

    document.querySelectorAll('.priority-btn').forEach(btn => btn.addEventListener('click', () => {
        selectedPriority = btn.dataset.priority;
        setSelectedButton('.priority-btn', selectedPriority);
    }));
    document.querySelectorAll('.status-btn').forEach(btn => btn.addEventListener('click', () => {
        selectedStatus = btn.dataset.status;
        setSelectedButton('.status-btn', selectedStatus);
    }));

    const setupDate = () => {
         const now = new Date();
         document.getElementById('day-name-date').textContent = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric' });
         document.getElementById('month-year').textContent = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
         datePicker.min = new Date().toISOString().split('T')[0];
    };
    
    async function init() {
        await loadTasks();
        setupDate();
        updateTheme();
        render();

        window.electronAPI.onTasksUpdated(async () => {
            await loadTasks();
            render();
        });
    }
    
    init();
});