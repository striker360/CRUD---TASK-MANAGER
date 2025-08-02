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


// Sistema avanzado de gestión de prioridades
class TaskPrioritySystem {
    constructor() {
        this.priorityConfig = {
            high: {
                label: 'Alta',
                color: '#e74c3c',
                icon: 'fas fa-exclamation-triangle',
                weight: 3,
                maxAllowed: 5,
                urgencyThreshold: 3 // días antes de la fecha límite
            },
            medium: {
                label: 'Media',
                color: '#f39c12',
                icon: 'fas fa-clock',
                weight: 2,
                maxAllowed: 10,
                urgencyThreshold: 7
            },
            low: {
                label: 'Baja',
                color: '#27ae60',
                icon: 'fas fa-check-circle',
                weight: 1,
                maxAllowed: -1, // sin límite
                urgencyThreshold: 14
            }
        };
        this.initializePrioritySystem();
    }

    initializePrioritySystem() {
        this.updatePriorityIndicators();
        this.addPriorityEventListeners();
        this.createPriorityDashboard();
    }

    addPriorityEventListeners() {
        const prioritySelect = document.getElementById('taskPriority');
        if (prioritySelect) {
            prioritySelect.addEventListener('change', (e) => {
                this.handlePriorityChange(e.target.value);
            });
        }
    }

    handlePriorityChange(selectedPriority) {
        const config = this.priorityConfig[selectedPriority];
        const currentTasks = taskManager.getAllTasks();
        const sameOrHigherPriorityTasks = currentTasks.filter(task => 
            this.priorityConfig[task.priority].weight >= config.weight && 
            task.status === 'pending'
        );

        // Validar límites de prioridad
        if (config.maxAllowed > 0 && sameOrHigherPriorityTasks.length >= config.maxAllowed) {
            this.showPriorityWarning(selectedPriority, sameOrHigherPriorityTasks.length);
        }

        this.updatePriorityPreview(selectedPriority);
    }

    showPriorityWarning(priority, currentCount) {
        const config = this.priorityConfig[priority];
        const warningDiv = document.querySelector('.priority-warning') || this.createPriorityWarning();
        
        warningDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>¡Atención! Ya tienes ${currentCount} tareas de prioridad ${config.label.toLowerCase()} o superior pendientes. 
            Se recomienda completar algunas antes de agregar más.</span>
        `;
        warningDiv.style.display = 'block';
        
        setTimeout(() => {
            warningDiv.style.display = 'none';
        }, 5000);
    }

    createPriorityWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'priority-warning';
        document.querySelector('.task-form-section').appendChild(warningDiv);
        return warningDiv;
    }

    updatePriorityPreview(priority) {
        const config = this.priorityConfig[priority];
        const previewDiv = document.querySelector('.priority-preview') || this.createPriorityPreview();
        
        previewDiv.innerHTML = `
            <div class="priority-badge ${priority}">
                <i class="${config.icon}"></i>
                ${config.label}
            </div>
            <span class="priority-description">
                Esta tarea tendrá prioridad ${config.label.toLowerCase()}
            </span>
        `;
    }

    createPriorityPreview() {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'priority-preview';
        const priorityGroup = document.getElementById('taskPriority').parentNode;
        priorityGroup.appendChild(previewDiv);
        return previewDiv;
    }

    createPriorityDashboard() {
        const dashboard = document.createElement('div');
        dashboard.className = 'priority-dashboard';
        dashboard.innerHTML = `
            <h3><i class="fas fa-tachometer-alt"></i> Panel de Prioridades</h3>
            <div class="priority-stats">
                <div class="priority-stat high">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="count" id="highPriorityCount">0</span>
                    <span class="label">Alta</span>
                </div>
                <div class="priority-stat medium">
                    <i class="fas fa-clock"></i>
                    <span class="count" id="mediumPriorityCount">0</span>
                    <span class="label">Media</span>
                </div>
                <div class="priority-stat low">
                    <i class="fas fa-check-circle"></i>
                    <span class="count" id="lowPriorityCount">0</span>
                    <span class="label">Baja</span>
                </div>
            </div>
            <div class="priority-recommendations" id="priorityRecommendations"></div>
        `;
        
        const filtersSection = document.querySelector('.filters-section');
        filtersSection.parentNode.insertBefore(dashboard, filtersSection);
    }

    updatePriorityIndicators() {
        const tasks = taskManager.getAllTasks();
        const priorityCounts = this.calculatePriorityCounts(tasks);
        
        // Actualizar contadores
        Object.keys(priorityCounts).forEach(priority => {
            const countElement = document.getElementById(`${priority}PriorityCount`);
            if (countElement) {
                countElement.textContent = priorityCounts[priority];
            }
        });

        // Actualizar recomendaciones
        this.updatePriorityRecommendations(tasks, priorityCounts);
    }

    calculatePriorityCounts(tasks) {
        return {
            high: tasks.filter(t => t.priority === 'high' && t.status === 'pending').length,
            medium: tasks.filter(t => t.priority === 'medium' && t.status === 'pending').length,
            low: tasks.filter(t => t.priority === 'low' && t.status === 'pending').length
        };
    }

    updatePriorityRecommendations(tasks, counts) {
        const recommendationsEl = document.getElementById('priorityRecommendations');
        if (!recommendationsEl) return;

        const recommendations = [];
        
        // Tareas urgentes por fecha
        const urgentTasks = this.getUrgentTasks(tasks);
        if (urgentTasks.length > 0) {
            recommendations.push(`⚡ ${urgentTasks.length} tareas próximas a vencer`);
        }

        // Sobrecarga de alta prioridad
        if (counts.high > 3) {
            recommendations.push(`⚠️ Demasiadas tareas de alta prioridad (${counts.high})`);
        }

        // Sugerencias de productividad
        if (counts.low > counts.high + counts.medium) {
            recommendations.push(`💡 Considera aumentar la prioridad de algunas tareas`);
        }

        recommendationsEl.innerHTML = recommendations.length > 0 
            ? recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')
            : '<div class="no-recommendations">✅ Gestión de prioridades equilibrada</div>';
    }

    getUrgentTasks(tasks) {
        const today = new Date();
        return tasks.filter(task => {
            if (!task.dueDate || task.status === 'completed') return false;
            
            const dueDate = new Date(task.dueDate);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            const threshold = this.priorityConfig[task.priority].urgencyThreshold;
            
            return daysUntilDue <= threshold && daysUntilDue >= 0;
        });
    }

    // Algoritmo de sugerencia automática de prioridad
    suggestPriority(taskData) {
        let suggestedPriority = 'medium';
        let score = 0;

        // Factor: proximidad de fecha límite
        if (taskData.dueDate) {
            const daysUntilDue = Math.ceil((new Date(taskData.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue <= 3) score += 3;
            else if (daysUntilDue <= 7) score += 2;
            else if (daysUntilDue <= 14) score += 1;
        }

        // Factor: palabras clave en título
        const urgentKeywords = ['urgente', 'inmediato', 'crítico', 'importante', 'asap'];
        const titleLower = taskData.title.toLowerCase();
        if (urgentKeywords.some(keyword => titleLower.includes(keyword))) {
            score += 2;
        }

        // Factor: longitud de descripción (tareas más detalladas suelen ser más importantes)
        if (taskData.description && taskData.description.length > 100) {
            score += 1;
        }

        // Determinar prioridad basada en score
        if (score >= 4) suggestedPriority = 'high';
        else if (score >= 2) suggestedPriority = 'medium';
        else suggestedPriority = 'low';

        return suggestedPriority;
    }

    // Funcionalidad de auto-organización por prioridad
    autoSortTasksByPriority() {
        const tasks = taskManager.getAllTasks();
        const sortedTasks = tasks.sort((a, b) => {
            const priorityDiff = this.priorityConfig[b.priority].weight - this.priorityConfig[a.priority].weight;
            if (priorityDiff !== 0) return priorityDiff;
            
            // Si tienen la misma prioridad, ordenar por fecha límite
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            } else if (a.dueDate) {
                return -1;
            } else if (b.dueDate) {
                return 1;
            }
            return 0;
        });

        displayTasks(sortedTasks);
        this.showSortNotification();
    }

    showSortNotification() {
        const notification = document.createElement('div');
        notification.className = 'sort-notification';
        notification.innerHTML = '<i class="fas fa-sort"></i> Tareas ordenadas por prioridad';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Sobrescribir la función displayTasks para incluir indicadores de prioridad
function displayTasksWithPriority(tasks) {
    const container = document.getElementById('tasksContainer');
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-clipboard-list"></i>
                <p>No hay tareas creadas aún</p>
                <p class="subtitle">Comienza creando tu primera tarea</p>
            </div>`;
        return;
    }

    container.innerHTML = tasks.map(task => {
        const priorityConfig = prioritySystem.priorityConfig[task.priority];
        const isUrgent = prioritySystem.getUrgentTasks([task]).length > 0;
        
        return `
            <div class="task-card priority-${task.priority} ${task.status} ${isUrgent ? 'urgent' : ''}" data-id="${task.id}">
                <div class="task-header">
                    <h3>${task.title}</h3>
                    <div class="task-priority-indicator">
                        <span class="priority-badge ${task.priority}">
                            <i class="${priorityConfig.icon}"></i>
                            ${priorityConfig.label}
                        </span>
                        ${isUrgent ? '<span class="urgent-indicator"><i class="fas fa-fire"></i></span>' : ''}
                    </div>
                </div>
                <p class="task-description">${task.description || 'Sin descripción'}</p>
                <div class="task-meta">
                    <span class="due-date">
                        <i class="fas fa-calendar"></i>
                        ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Sin fecha límite'}
                    </span>
                    <span class="status-badge ${task.status}">
                        ${task.status === 'completed' ? 'Completada' : 'Pendiente'}
                    </span>
                </div>
                <div class="task-actions">
                    <button onclick="editTask('${task.id}')" class="btn-edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleTaskStatus('${task.id}')" class="btn-toggle">
                        <i class="fas ${task.status === 'completed' ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button onclick="deleteTask('${task.id}')" class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Inicializar sistema de prioridades
let prioritySystem;
document.addEventListener('DOMContentLoaded', function() {
    prioritySystem = new TaskPrioritySystem();
    
    // Reemplazar función original de displayTasks
    window.displayTasks = displayTasksWithPriority;
});