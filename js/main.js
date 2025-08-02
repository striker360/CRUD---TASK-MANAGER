// Instancia global del administrador de tareas
const taskManager = new TaskManager();

// Referencias a elementos del DOM
const elements = {
    form: document.getElementById('taskForm'),
    titleInput: document.getElementById('taskTitle'),
    descriptionInput: document.getElementById('taskDescription'),
    priorityInput: document.getElementById('taskPriority'),
    dueDateInput: document.getElementById('taskDueDate'),
    submitBtn: document.getElementById('submitBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    searchInput: document.getElementById('searchInput'),
    priorityFilter: document.getElementById('priorityFilter'),
    statusFilter: document.getElementById('statusFilter'),
    tasksContainer: document.getElementById('tasksContainer'),
    totalTasks: document.getElementById('totalTasks'),
    pendingTasks: document.getElementById('pendingTasks'),
    completedTasks: document.getElementById('completedTasks'),
    confirmModal: document.getElementById('confirmModal'),
    confirmBtn: document.getElementById('confirmBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    confirmMessage: document.getElementById('confirmMessage')
};

// Variables globales
let currentAction = null;
let currentTaskId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    renderTasks();
    updateStats();
});

// Configurar todos los event listeners
function setupEventListeners() {
    // Formulario de tarea
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.cancelBtn.addEventListener('click', cancelEdit);
    
    // Filtros y búsqueda
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    elements.priorityFilter.addEventListener('change', handleFilter);
    elements.statusFilter.addEventListener('change', handleFilter);
    
    // Modal de confirmación
    elements.confirmBtn.addEventListener('click', confirmAction);
    elements.cancelModalBtn.addEventListener('click', closeModal);
    elements.confirmModal.addEventListener('click', function(e) {
        if (e.target === elements.confirmModal) {
            closeModal();
        }
    });
    
    // Escape key para cerrar modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            cancelEdit();
        }
    });
}

// Inicializar aplicación
function initializeApp() {
    // Configurar fecha mínima para el input de fecha
    const today = new Date().toISOString().split('T')[0];
    elements.dueDateInput.min = today;
    
    // Mostrar mensaje de bienvenida si es la primera vez
    if (taskManager.getAllTasks().length === 0) {
        showWelcomeMessage();
    }
}

// Manejar envío del formulario
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(elements.form);
    const taskData = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        dueDate: formData.get('dueDate')
    };
    
    // Validar datos
    const validation = taskManager.validateTask(taskData);
    if (!validation.isValid) {
        showValidationErrors(validation.errors);
        return;
    }
    
    try {
        if (taskManager.currentEditId) {
            // Actualizar tarea existente
            taskManager.updateTask(taskManager.currentEditId, taskData);
            showNotification('Tarea actualizada correctamente', 'success');
            taskManager.currentEditId = null;
        } else {
            // Crear nueva tarea
            taskManager.createTask(taskData);
            showNotification('Tarea creada correctamente', 'success');
        }
        
        resetForm();
        renderTasks();
        updateStats();
        
    } catch (error) {
        showNotification('Error al guardar la tarea: ' + error.message, 'error');
    }
}

// Mostrar errores de validación
function showValidationErrors(errors) {
    // Limpiar errores previos
    clearValidationErrors();
    
    Object.keys(errors).forEach(field => {
        const input = document.getElementById(`task${field.charAt(0).toUpperCase() + field.slice(1)}`);
        if (input) {
            input.classList.add('error');
            
            // Crear mensaje de error
            const errorElement = document.createElement('span');
            errorElement.className = 'error-message';
            errorElement.textContent = errors[field];
            input.parentNode.appendChild(errorElement);
        }
    });
}

// Limpiar errores de validación
function clearValidationErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());
}

// Resetear formulario
function resetForm() {
    elements.form.reset();
    elements.submitBtn.innerHTML = '<i class="fas fa-plus"></i> Crear Tarea';
    elements.cancelBtn.style.display = 'none';
    taskManager.currentEditId = null;
    clearValidationErrors();
}

// Cancelar edición
function cancelEdit() {
    resetForm();
}

// Editar tarea
function editTask(id) {
    const task = taskManager.getTaskById(id);
    if (!task) return;
    
    // Llenar formulario con datos de la tarea
    elements.titleInput.value = task.title;
    elements.descriptionInput.value = task.description;
    elements.priorityInput.value = task.priority;
    elements.dueDateInput.value = task.dueDate;
    
    // Cambiar estado del formulario
    elements.submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Tarea';
    elements.cancelBtn.style.display = 'inline-flex';
    taskManager.currentEditId = id;
    
    // Scroll al formulario
    document.querySelector('.task-form-section').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
    
    // Focus en el título
    elements.titleInput.focus();
}

// Cambiar estado de tarea
function toggleTaskStatus(id) {
    try {
        taskManager.toggleTaskStatus(id);
        renderTasks();
        updateStats();
        
        const task = taskManager.getTaskById(id);
        const statusText = task.status === 'completed' ? 'completada' : 'marcada como pendiente';
        showNotification(`Tarea ${statusText}`, 'success');
        
    } catch (error) {
        showNotification('Error al cambiar estado: ' + error.message, 'error');
    }
}

// Confirmar eliminación de tarea
function confirmDeleteTask(id) {
    const task = taskManager.getTaskById(id);
    if (!task) return;
    
    currentAction = 'delete';
    currentTaskId = id;
    elements.confirmMessage.textContent = `¿Estás seguro de que deseas eliminar la tarea "${task.title}"?`;
    showModal();
}

// Eliminar tarea
function deleteTask(id) {
    try {
        const deletedTask = taskManager.deleteTask(id);
        renderTasks();
        updateStats();
        showNotification(`Tarea "${deletedTask.title}" eliminada`, 'success');
        
    } catch (error) {
        showNotification('Error al eliminar tarea: ' + error.message, 'error');
    }
}

// Manejar búsqueda
function handleSearch() {
    renderTasks();
}

// Manejar filtros
function handleFilter() {
    renderTasks();
}

// Obtener filtros actuales
function getCurrentFilters() {
    return {
        search: elements.searchInput.value.trim(),
        priority: elements.priorityFilter.value,
        status: elements.statusFilter.value
    };
}

// Renderizar tareas
function renderTasks() {
    const filters = getCurrentFilters();
    let tasks = taskManager.filterTasks(filters);
    
    // Ordenar tareas: pendientes primero, luego por prioridad y fecha
    tasks = taskManager.sortTasks(tasks, 'createdAt', 'desc');
    tasks.sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'pending' ? -1 : 1;
        }
        return 0;
    });
    
    if (tasks.length === 0) {
        showNoTasksMessage(filters);
        return;
    }
    
    const tasksHTML = tasks.map(task => createTaskCard(task)).join('');
    elements.tasksContainer.innerHTML = tasksHTML;
}

// Crear tarjeta de tarea
function createTaskCard(task) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && task.status === 'pending';
    const formattedDate = dueDate ? formatDate(dueDate) : '';
    
    return `
        <div class="task-card ${task.status}" data-task-id="${task.id}">
            <div class="task-status"></div>
            <div class="task-header">
                <h3 class="task-title">${escapeHtml(task.title)}</h3>
                <span class="task-priority ${task.priority}">${getPriorityText(task.priority)}</span>
            </div>
            
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
            
            <div class="task-meta">
                <div class="task-date">
                    ${dueDate ? `
                        <i class="fas fa-calendar${isOverdue ? '-times' : '-alt'}"></i>
                        <span class="${isOverdue ? 'text-danger' : ''}" title="${isOverdue ? 'Tarea vencida' : 'Fecha límite'}">
                            ${formattedDate}
                        </span>
                    ` : '<span class="text-muted">Sin fecha límite</span>'}
                </div>
                <div class="task-created">
                    <i class="fas fa-clock"></i>
                    <span title="Fecha de creación">${formatDate(new Date(task.createdAt))}</span>
                </div>
            </div>
            
            <div class="task-actions">
                <button class="btn-sm btn-success" onclick="toggleTaskStatus(${task.id})" title="${task.status === 'pending' ? 'Marcar como completada' : 'Marcar como pendiente'}">
                    <i class="fas fa-${task.status === 'pending' ? 'check' : 'undo'}"></i>
                    ${task.status === 'pending' ? 'Completar' : 'Deshacer'}
                </button>
                <button class="btn-sm btn-warning" onclick="editTask(${task.id})" title="Editar tarea">
                    <i class="fas fa-edit"></i>
                    Editar
                </button>
                <button class="btn-sm btn-danger" onclick="confirmDeleteTask(${task.id})" title="Eliminar tarea">
                    <i class="fas fa-trash"></i>
                    Eliminar
                </button>
            </div>
        </div>
    `;
}

// Mostrar mensaje cuando no hay tareas
function showNoTasksMessage(filters) {
    const hasFilters = filters.search || filters.priority || filters.status;
    
    if (hasFilters) {
        elements.tasksContainer.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-search"></i>
                <p>No se encontraron tareas</p>
                <p class="subtitle">Intenta ajustar los filtros de búsqueda</p>
            </div>
        `;
    } else {
        elements.tasksContainer.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-clipboard-list"></i>
                <p>No hay tareas creadas aún</p>
                <p class="subtitle">Comienza creando tu primera tarea</p>
            </div>
        `;
    }
}

// Actualizar estadísticas
function updateStats() {
    const stats = taskManager.getStats();
    elements.totalTasks.textContent = `Total: ${stats.total}`;
    elements.pendingTasks.textContent = `Pendientes: ${stats.pending}`;
    elements.completedTasks.textContent = `Completadas: ${stats.completed}`;
}

// Mostrar modal
function showModal() {
    elements.confirmModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Cerrar modal
function closeModal() {
    elements.confirmModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentAction = null;
    currentTaskId = null;
}

// Confirmar acción del modal
function confirmAction() {
    if (currentAction === 'delete' && currentTaskId) {
        deleteTask(currentTaskId);
    }
    closeModal();
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    // Color según tipo
    const colors = {
        success: '#059669',
        error: '#dc2626',
        warning: '#d97706',
        info: '#2563eb'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Obtener icono para notificación
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

// Mostrar mensaje de bienvenida
function showWelcomeMessage() {
    setTimeout(() => {
        showNotification('¡Bienvenido al Task Manager! Comienza creando tu primera tarea.', 'info');
    }, 1000);
}

// Utilidades
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

function getPriorityText(priority) {
    const priorities = {
        high: 'Alta',
        medium: 'Media',
        low: 'Baja'
    };
    return priorities[priority] || priority;
}

// Añadir estilos para animaciones de notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
