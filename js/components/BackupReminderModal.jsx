
        function BackupReminderModal({ onExport, onDismiss }) {
            const lastReminder = storage.getItem('lastBackupReminder');
            const isFirstTime = !lastReminder;

            return (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-title">💾 Backup Reminder</div>
                        <p style={{ color: '#888', marginBottom: '20px', fontSize: '14px', lineHeight: '1.6' }}>
                            {isFirstTime ? (
                                <>
                                    <strong style={{ color: '#b8b8d0' }}>Your data is stored locally on this device.</strong>
                                    <br /><br />
                                    It's a good idea to download your first backup now. You can restore it later by importing the file in Settings ⚙️ if you switch devices or clear your browser data.
                                    <br /><br />
                                    You can manually backup anytime in Settings.
                                </>
                            ) : (
                                "It's been a month! Back up your workout data to keep it safe."
                            )}
                        </p>
                        <button className="modal-btn primary" onClick={onExport}>
                            Download Backup
                        </button>
                        <button className="modal-btn" onClick={onDismiss}>
                            Remind Me Later
                        </button>
                    </div>
                </div>
            );
        }
