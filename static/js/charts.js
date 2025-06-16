document.addEventListener('DOMContentLoaded', function() {
    // Verificar que los elementos del DOM existen
    console.log('Elementos canvas:');
    console.log('profesoresCursosChart:', document.getElementById('profesoresCursosChart'));

    // Configuración inicial
    const currentDate = new Date();
    document.getElementById('currentDate').textContent = currentDate.toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    document.getElementById('updateTime').textContent = currentDate.toLocaleTimeString();

    // Tema oscuro/claro
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    if (localStorage.getItem('theme') === 'dark') {
        html.setAttribute('data-bs-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    themeToggle.addEventListener('click', () => {
        if (html.getAttribute('data-bs-theme') === 'dark') {
            html.setAttribute('data-bs-theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            html.setAttribute('data-bs-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
    });

    // Estadísticas resumidas
    async function loadSummaryStats() {
        try {
            const [estudiantesRes, cursosRes, rendimientoRes] = await Promise.all([
                fetch('/api/estudiantes-por-carrera'),
                fetch('/api/promedio-nota-curso'),
                fetch('/api/rendimiento-curso')
            ]);

            const estudiantes = await estudiantesRes.json();
            const curso = await cursosRes.json();
            const rendimiento = await rendimientoRes.json();

            // Total estudiantes
            const totalEstudiantes = estudiantes.reduce((acc, curr) => acc + curr.cantidad, 0);
            animateValue('totalEstudiantes', 0, totalEstudiantes, 1000);

            // Total curso
            animateValue('totalCursos', 0, curso.length, 1000);

            // Promedio general
            const promedioGeneral = curso.reduce((acc, curr) => acc + curr.promedio, 0) / curso.length;
            animateValue('promedioGeneral', 0, promedioGeneral, 1000, 1);

            // Tasa de aprobación
            const tasaAprobacion = rendimiento.reduce((acc, curr) => acc + curr.tasa_aprobacion, 0) / rendimiento.length;
            animateValue('tasaAprobacion', 0, Math.round(tasaAprobacion), 1000, 0, '%');

        } catch (error) {
            console.error('Error loading summary stats:', error);
        }
    }

    // Animación para valores numéricos
    function animateValue(id, start, end, duration, decimals = 0, suffix = '') {
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = progress * (end - start) + start;
            obj.innerHTML = value.toFixed(decimals) + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Gráfico de distribución por carrera
    async function renderCarreraChart() {
        try {
            const response = await fetch('/api/estudiantes-por-carrera');
            const data = await response.json();
            
            const ctx = document.getElementById('carreraChart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.map(item => item.carrera),
                    datasets: [{
                        data: data.map(item => item.cantidad),
                        backgroundColor: [
                            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e',
                            '#e74a3b', '#858796', '#5a5c69', '#f8f9fc'
                        ],
                        hoverBackgroundColor: [
                            '#2e59d9', '#17a673', '#2c9faf', '#dda20a',
                            '#be2617', '#656769', '#3a3b45', '#dde2f1'
                        ],
                        hoverBorderColor: "rgba(234, 236, 244, 1)",
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            backgroundColor: "rgb(255,255,255)",
                            bodyColor: "#858796",
                            borderColor: '#dddfeb',
                            borderWidth: 1,
                            padding: 15,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        },
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            }
                        },
                        animation: {
                            animateScale: true,
                            animateRotate: true
                        }
                    },
                    cutout: '70%',
                }
            });
        } catch (error) {
            console.error('Error rendering carrera chart:', error);
        }
    }

    // Tabla de top 3 estudiantes
    async function renderTopEstudiantes() {
        try {
            const response = await fetch('/api/top-estudiantes');
            const data = await response.json();
            
            const container = document.getElementById('topEstudiantes');
            container.innerHTML = `
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Estudiante</th>
                            <th>Carrera</th>
                            <th>Curso</th>
                            <th>Nota</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((estudiante, index) => `
                            <tr class="animate__animated animate__fadeIn" style="animation-delay: ${index * 0.2}s">
                                <td>
                                    ${index === 0 ? '<i class="fas fa-trophy text-warning"></i>' : 
                                      index === 1 ? '<i class="fas fa-medal text-secondary"></i>' : 
                                      index === 2 ? '<i class="fas fa-award text-danger"></i>' : index + 1}
                                </td>
                                <td>${estudiante.nombre}</td>
                                <td>${estudiante.carrera}</td>
                                <td>${estudiante.curso}</td>
                                <td>
                                    <span class="badge ${index === 0 ? 'bg-warning' : 'bg-success'} animate__animated animate__pulse" 
                                          style="animation-delay: ${index * 0.3}s">
                                        ${estudiante.mejor_nota.toFixed(1)}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error rendering top estudiantes:', error);
            document.getElementById('topEstudiantes').innerHTML = `
                <div class="alert alert-danger m-3">Error cargando los mejores estudiantes</div>
            `;
        }
    }

    // Gráfico de distribución por semestre
    async function renderSemestreChart() {
        try {
            const response = await fetch('/api/distribucion-semestres');
            const data = await response.json();
            
            const ctx = document.getElementById('semestreChart').getContext('2d');
            new Chart(ctx, {
                type: 'polarArea',
                data: {
                    labels: data.map(item => item._id),
                    datasets: [{
                        data: data.map(item => item.count),
                        backgroundColor: [
                            'rgba(78, 115, 223, 0.8)',
                            'rgba(28, 200, 138, 0.8)',
                            'rgba(54, 185, 204, 0.8)',
                            'rgba(246, 194, 62, 0.8)',
                            'rgba(231, 74, 59, 0.8)'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        },
                        animation: {
                            animateRotate: true,
                            animateScale: true
                        }
                    },
                    scales: {
                        r: {
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-light')
                            },
                            ticks: {
                                display: false,
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering semestre chart:', error);
        }
    }

    // Gráfico de rendimiento por curso
    async function renderRendimientoChart() {
        try {
            const response = await fetch('/api/rendimiento-curso');
            const data = await response.json();
            
            const ctx = document.getElementById('rendimientoChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(item => item.curso),
                    datasets: [
                        {
                            label: 'Tasa Aprobación (%)',
                            data: data.map(item => item.tasa_aprobacion),
                            backgroundColor: 'rgba(28, 200, 138, 0.8)',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Promedio nota',
                            data: data.map(item => item.promedio_nota),
                            backgroundColor: 'rgba(78, 115, 223, 0.8)',
                            yAxisID: 'y1',
                            type: 'line',
                            borderColor: 'rgba(78, 115, 223, 1)',
                            borderWidth: 3,
                            pointBackgroundColor: 'rgba(78, 115, 223, 1)',
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }
                    ]
                },
                options: {
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += context.datasetIndex === 0 ? 
                                            context.parsed.y.toFixed(1) + '%' : 
                                            context.parsed.y.toFixed(1);
                                    }
                                    return label;
                                }
                            }
                        },
                        legend: {
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            }
                        },
                        animation: {
                            duration: 2000,
                            easing: 'easeOutQuart'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            max: 100,
                            title: {
                                display: true,
                                text: 'Tasa Aprobación (%)',
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            },
                            grid: {
                                drawOnChartArea: true,
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-light')
                            },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            max: 100,
                            title: {
                                display: true,
                                text: 'Promedio nota',
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            },
                            grid: {
                                drawOnChartArea: false,
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-light')
                            },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            }
                        },
                        x: {
                            grid: {
                                display: false,
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-light')
                            },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering rendimiento chart:', error);
        }
    }


    // Gráfico de cursos por profesor
    async function renderProfesoresCursosChart() {
        const ctx = document.getElementById('profesoresCursosChart');
        if (!ctx) {
            console.error('No se encontró el elemento profesoresCursosChart');
            return;
        }

        try {
            const response = await fetch('/api/profesor-curso');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: data.map(item => item._id),
                    datasets: [{
                        label: 'Cursos impartidos',
                        data: data.map(item => item.total_cursos),
                        backgroundColor: 'rgba(78, 115, 223, 0.2)',
                        borderColor: 'rgba(78, 115, 223, 1)',
                        pointBackgroundColor: 'rgba(78, 115, 223, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    }
                }
            });
        } catch (error) {
            console.error('Error:', error);
            ctx.parentElement.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        }
    }

    // Tabla de todos los datos
    async function renderTablaDatos() {
        try {
            const response = await fetch('/api/todos-datos');
            const data = await response.json();
            
            const tbody = document.querySelector('#tablaDatos tbody');
            tbody.innerHTML = data.map((item, index) => `
                <tr class="animate__animated animate__fadeIn" style="animation-delay: ${index * 0.02}s">
                    <td>${item.estudiantes}</td>
                    <td>${item.carrera}</td>
                    <td>${item.curso}</td>
                    <td>${item.profesor}</td>
                    <td>
                        <span class="badge ${item.nota >= 90 ? 'bg-success' : item.nota >= 70 ? 'bg-primary' : item.nota >= 60 ? 'bg-warning' : 'bg-danger'}">
                            ${item.nota.toFixed(1)}
                        </span>
                    </td>
                    <td>${item.semestre}</td>
                </tr>
            `).join('');
            
            // Agregar animación de aparición gradual
            const rows = document.querySelectorAll('#tablaDatos tbody tr');
            rows.forEach((row, index) => {
                setTimeout(() => {
                    row.style.opacity = '1';
                }, index * 50);
            });
            
        } catch (error) {
            console.error('Error rendering tabla datos:', error);
            document.querySelector('#tablaDatos tbody').innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">Error cargando los datos</td>
                </tr>
            `;
        }
    }

    // Modificar loadAllCharts para manejar errores
    async function loadAllCharts() {
        try {
            await loadSummaryStats();
            await renderCarreraChart();
            await renderTopEstudiantes();
            await renderSemestreChart();
            await renderRendimientoChart();
            await renderProfesoresCursosChart();
            await renderTablaDatos();
        } catch (error) {
            console.error('Error en loadAllCharts:', error);
        }
        
        document.querySelectorAll('.card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    loadAllCharts();

    // Actualizar datos cada 5 minutos
    setInterval(loadAllCharts, 300000);
});