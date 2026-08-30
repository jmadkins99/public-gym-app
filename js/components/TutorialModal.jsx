
        function TutorialModal({ onDismiss }) {
            return (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '500px' }}>

                        {/* Step 1 */}
                        <div style={{ marginBottom: '25px', padding: '20px', background: '#1a1a2a', borderRadius: '12px', border: '2px solid #2a2a3a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, var(--accent), var(--accent-hi))',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '16px'
                                }}>1</div>
                                <div style={{ color: '#b8b8d0', fontWeight: '600', fontSize: '16px' }}>Enter Your Data</div>
                            </div>
                            <div style={{ color: '#8a8aa0', fontSize: '14px', lineHeight: '1.5', paddingLeft: '44px' }}>
                                Fill in the <strong style={{ color: '#b8b8d0' }}>weight and reps</strong> for each exercise you completed.
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div style={{ marginBottom: '25px', padding: '20px', background: '#1a1a2a', borderRadius: '12px', border: '2px solid #2a2a3a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, var(--accent), var(--accent-hi))',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '16px'
                                }}>2</div>
                                <div style={{ color: '#b8b8d0', fontWeight: '600', fontSize: '16px' }}>Tap LOG</div>
                            </div>
                            <div style={{ color: '#8a8aa0', fontSize: '14px', lineHeight: '1.5', paddingLeft: '44px' }}>
                                Press the <strong style={{ color: '#b8b8d0' }}>LOG</strong> button for each exercise to save your set.
                                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-muted)' }}>
                                    ↳ The button will show <span style={{ color: '#8aaa8a' }}>✓ Logged</span> when saved
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div style={{ marginBottom: '25px', padding: '20px', background: '#1a1a2a', borderRadius: '12px', border: '2px solid #2a2a3a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, var(--accent), var(--accent-hi))',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '16px'
                                }}>3</div>
                                <div style={{ color: '#b8b8d0', fontWeight: '600', fontSize: '16px' }}>Submit Your Day</div>
                            </div>
                            <div style={{ color: '#8a8aa0', fontSize: '14px', lineHeight: '1.5', paddingLeft: '44px' }}>
                                When you're done logging all exercises, tap <strong style={{ color: '#b8b8d0' }}>Submit Day and View Breakdown</strong> at the bottom.
                                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-muted)' }}>
                                    ↳ This submits your workout for the day and shows your progress summary
                                </div>
                            </div>
                        </div>


                        <button className="modal-btn primary" onClick={onDismiss} style={{ width: '100%' }}>
                            Got It!
                        </button>
                    </div>
                </div>
            );
        }
