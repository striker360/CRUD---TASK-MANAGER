// Clase principal para manejar las tareas
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentEditId = null;
        this.nextId = this.getNextId();
    }

    // Generar siguiente ID único
    getNextId() {
        if (this.tasks.length === 0) return 1;
        return Math.max(...this.tasks.map(task => task.id)) + 1;
    }

    // Crear nueva tarea
    createTask(taskData) {
        const task = {
            id: this.nextId++,
            title: taskData.title.trim(),
            description: taskData.description.trim(),
            priority: taskData.priority,
            dueDate: taskData.dueDate,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveToLocalStorage();
        return task;
    }

    // Leer todas las tareas
    getAllTasks() {
        return [...this.tasks];
    }

    // Leer tarea por ID
    getTaskById(id) {
        return this.tasks.find(task => task.id === parseInt(id));
    }

    // Actualizar tarea
    updateTask(id, updates) {
        const taskIndex = this.tasks.findIndex(task => task.id === parseInt(id));
        if (taskIndex === -1) {
            throw new Error('Tarea no encontrada');
        }

        this.tasks[taskIndex] = {
            ...this.tasks[taskIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveToLocalStorage();
        return this.tasks[taskIndex];
    }

    // Eliminar tarea
    deleteTask(id) {
        const taskIndex = this.tasks.findIndex(task => task.id === parseInt(id));
        if (taskIndex === -1) {
            throw new Error('Tarea no encontrada');
        }

        const deletedTask = this.tasks.splice(taskIndex, 1)[0];
        this.saveToLocalStorage();
        return deletedTask;
    }

    // Marcar tarea como completada/pendiente
    toggleTaskStatus(id) {
        const task = this.getTaskById(id);
        if (!task) {
            throw new Error('Tarea no encontrada');
        }

        const newStatus = task.status === 'pending' ? 'completed' : 'pending';
        return this.updateTask(id, { status: newStatus });
    }

    // Filtrar tareas
    filterTasks(filters) {
        let filtered = this.getAllTasks();

        // Filtro por búsqueda de texto
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm)
            );
        }

        // Filtro por prioridad
        if (filters.priority) {
            filtered = filtered.filter(task => task.priority === filters.priority);
        }

        // Filtro por estado
        if (filters.status) {
            filtered = filtered.filter(task => task.status === filters.status);
        }

        return filtered;
    }

    // Obtener estadísticas
    getStats() {
        const total = this.tasks.length;
        const pending = this.tasks.filter(task => task.status === 'pending').length;
        const completed = this.tasks.filter(task => task.status === 'completed').length;

        return { total, pending, completed };
    }

    // Ordenar tareas
    sortTasks(tasks, sortBy = 'createdAt', order = 'desc') {
        return tasks.sort((a, b) => {
            let valueA = a[sortBy];
            let valueB = b[sortBy];

            // Manejo especial para prioridades
            if (sortBy === 'priority') {
                const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                valueA = priorityOrder[valueA];
                valueB = priorityOrder[valueB];
            }

            // Manejo especial para fechas
            if (sortBy === 'dueDate' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            }

            if (order === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
    }

    // Validar datos de tarea
    validateTask(taskData) {
        const errors = {};

        if (!taskData.title || taskData.title.trim().length === 0) {
            errors.title = 'El título es obligatorio';
        } else if (taskData.title.trim().length > 100) {
            errors.title = 'El título no puede tener más de 100 caracteres';
        }

        if (taskData.description && taskData.description.length > 500) {
            errors.description = 'La descripción no puede tener más de 500 caracteres';
        }

        if (!['low', 'medium', 'high'].includes(taskData.priority)) {
            errors.priority = 'Prioridad inválida';
        }

        if (taskData.dueDate) {
            const dueDate = new Date(taskData.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (dueDate < today) {
                errors.dueDate = 'La fecha límite no puede ser anterior a hoy';
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    // Exportar tareas a JSON
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `tasks_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Importar tareas desde JSON
    importTasks(jsonData) {
        try {
            const importedTasks = JSON.parse(jsonData);
            
            if (!Array.isArray(importedTasks)) {
                throw new Error('Formato inválido');
            }

            // Validar estructura de cada tarea
            for (const task of importedTasks) {
                if (!task.id || !task.title || !task.status || !task.priority) {
                    throw new Error('Estructura de tarea inválida');
                }
            }

            // Ajustar IDs para evitar conflictos
            let maxCurrentId = this.getNextId() - 1;
            const adjustedTasks = importedTasks.map(task => ({
                ...task,
                id: ++maxCurrentId
            }));

            this.tasks = [...this.tasks, ...adjustedTasks];
            this.nextId = maxCurrentId + 1;
            this.saveToLocalStorage();
            
            return adjustedTasks.length;
        } catch (error) {
            throw new Error('Error al importar tareas: ' + error.message);
        }
    }

    // Limpiar todas las tareas
    clearAllTasks() {
        this.tasks = [];
        this.nextId = 1;
        this.saveToLocalStorage();
    }

    // Guardar en localStorage
    saveToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    // Buscar tareas avanzada
    advancedSearch(query) {
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        
        return this.tasks.filter(task => {
            const searchText = `${task.title} ${task.description}`.toLowerCase();
            return searchTerms.every(term => searchText.includes(term));
        });
    }

    // Obtener tareas por fecha
    getTasksByDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return this.tasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= start && dueDate <= end;
        });
    }

    // Obtener tareas vencidas
    getOverdueTasks() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        return this.tasks.filter(task => {
            if (!task.dueDate || task.status === 'completed') return false;
            return new Date(task.dueDate) < today;
        });
    }

    // Obtener tareas próximas a vencer
    getUpcomingTasks(days = 7) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);
        
        return this.tasks.filter(task => {
            if (!task.dueDate || task.status === 'completed') return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= today && dueDate <= futureDate;
        });
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}

formatDate(dateString) {
    if (!dateString) return 'Sin fecha límite';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC'
    };
    
    return date.toLocaleDateString('es-ES', options);
}