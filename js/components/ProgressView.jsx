        const { useState, useEffect, useRef, useMemo } = React;

        function ProgressView({ workoutHistory, selectedExercise, setSelectedExercise, exercisesByDay }) {
            const allExercises = Object.values(exercisesByDay).flat();

            useEffect(() => {
                if (workoutHistory.length === 0) return;

                const ctx = document.getElementById('progressChart');
                if (!ctx) return;

                const exercise = allExercises.find(e => e.id === selectedExercise);
                const exerciseData = workoutHistory
                    .map(w => ({
                        date: new Date(w.date),
                        exercise: w.exercises.find(e => e.id === selectedExercise)
                    }))
                    .filter(d => d.exercise)
                    .reverse();

                if (exercise?.type === 'assault-bike') {
                    const chart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: exerciseData.map(d => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                            datasets: [
                                {
                                    label: 'Rounds',
                                    data: exerciseData.map(d => parseInt(d.exercise.rounds) || 0),
                                    borderColor: '#0a84ff',
                                    backgroundColor: 'rgba(10, 132, 255, 0.1)',
                                    tension: 0.3
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { labels: { color: '#fff' } }
                            },
                            scales: {
                                x: {
                                    ticks: { color: '#888' },
                                    grid: { color: '#2a2a2a' },
                                    title: {
                                        display: true,
                                        text: 'Date',
                                        color: '#888'
                                    }
                                },
                                y: {
                                    ticks: { color: '#888' },
                                    grid: { color: '#2a2a2a' },
                                    title: {
                                        display: true,
                                        text: 'Rounds',
                                        color: '#888'
                                    }
                                }
                            }
                        }
                    });
                    return () => chart.destroy();
                }

                if (exercise?.type === 'stairmaster') {
                    const chart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: exerciseData.map(d => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                            datasets: [
                                {
                                    label: 'Time (seconds)',
                                    data: exerciseData.map(d => parseTimeToSeconds(d.exercise.time)),
                                    borderColor: '#0a84ff',
                                    backgroundColor: 'rgba(10, 132, 255, 0.1)',
                                    tension: 0.3
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { labels: { color: '#fff' } }
                            },
                            scales: {
                                x: {
                                    ticks: { color: '#888' },
                                    grid: { color: '#2a2a2a' },
                                    title: {
                                        display: true,
                                        text: 'Date',
                                        color: '#888'
                                    }
                                },
                                y: {
                                    ticks: {
                                        color: '#888',
                                        callback: function(value) {
                                            return formatSecondsToTime(value);
                                        }
                                    },
                                    grid: { color: '#2a2a2a' },
                                    title: {
                                        display: true,
                                        text: 'Time',
                                        color: '#888'
                                    }
                                }
                            }
                        }
                    });
                    return () => chart.destroy();
                }

                if (exercise?.isCardio || exercise?.typeId === 'cardio') {
                    const chart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: exerciseData.map(d => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                            datasets: [
                                {
                                    label: 'Time (seconds)',
                                    data: exerciseData.map(d => {
                                        const minutes = parseInt(d.exercise.minutes) || 0;
                                        const seconds = parseInt(d.exercise.seconds) || 0;
                                        return minutes * 60 + seconds;
                                    }),
                                    borderColor: '#0a84ff',
                                    backgroundColor: 'rgba(10, 132, 255, 0.1)',
                                    tension: 0.3
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { labels: { color: '#fff' } }
                            },
                            scales: {
                                x: {
                                    ticks: { color: '#888' },
                                    grid: { color: '#2a2a2a' },
                                    title: {
                                        display: true,
                                        text: 'Date',
                                        color: '#888'
                                    }
                                },
                                y: {
                                    ticks: {
                                        color: '#888',
                                        callback: function(value) {
                                            return formatSecondsToTime(value);
                                        }
                                    },
                                    grid: { color: '#2a2a2a' },
                                    title: {
                                        display: true,
                                        text: 'Time',
                                        color: '#888'
                                    }
                                }
                            }
                        }
                    });
                    return () => chart.destroy();
                }

                // Standard exercise - show only weight
                const chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: exerciseData.map(d => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                        datasets: [
                            {
                                label: 'Weight (lbs)',
                                data: exerciseData.map(d => {
                                    if (d.exercise.weight === 'Body Weight') return 0;
                                    return parseFloat(d.exercise.weight) || 0;
                                }),
                                borderColor: '#0a84ff',
                                backgroundColor: 'rgba(10, 132, 255, 0.1)',
                                tension: 0.3
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { labels: { color: '#fff' } }
                        },
                        scales: {
                            x: {
                                ticks: { color: '#888' },
                                grid: { color: '#2a2a2a' },
                                title: {
                                    display: true,
                                    text: 'Date',
                                    color: '#888'
                                }
                            },
                            y: {
                                ticks: { color: '#888' },
                                grid: { color: '#2a2a2a' },
                                title: {
                                    display: true,
                                    text: 'Weight (lbs)',
                                    color: '#888'
                                }
                            }
                        }
                    }
                });

                return () => chart.destroy();
            }, [workoutHistory, selectedExercise]);

            if (workoutHistory.length === 0) {
                return (
                    <div className="empty-state">
                        <div className="empty-state-icon">📈</div>
                        <div>Complete some workouts to see progress</div>
                    </div>
                );
            }

            return (
                <>
                    <select
                        className="exercise-select"
                        value={selectedExercise}
                        onChange={(e) => setSelectedExercise(e.target.value)}
                    >
                        {Object.keys(exercisesByDay).sort((a, b) => parseInt(a) - parseInt(b)).map(dayNum => {
                            const dayExercises = exercisesByDay[dayNum];
                            // Group exercises by category
                            const categories = [...new Set(dayExercises.map(e => e.category))];

                            return categories.map(category => (
                                <optgroup key={`${dayNum}-${category}`} label={`Day ${dayNum} - ${category}`}>
                                    {dayExercises.filter(e => e.category === category).map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                                    ))}
                                </optgroup>
                            ));
                        })}
                    </select>
                    <div className="chart-container">
                        <div className="chart-title">
                            {allExercises.find(e => e.id === selectedExercise)?.name}
                        </div>
                        <canvas id="progressChart"></canvas>
                    </div>
                </>
            );
        }
