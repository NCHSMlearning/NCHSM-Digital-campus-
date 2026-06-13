// js/integration-bridge.js
const MAIN_SYSTEM_API = 'https://nchsm-marks-proxy.onrender.com';

class SystemIntegrationBridge {
    constructor() {
        this.isConnected = false;
        this.studentData = null;
    }

    async connect(admissionNumber, studentEmail) {
        console.log('🔌 Connecting to Nursing School System...');
        
        try {
            // Test connection
            const testResponse = await fetch(`${MAIN_SYSTEM_API}/api/health`);
            if (!testResponse.ok) throw new Error('Main system unreachable');
            
            // Fetch student data
            const studentResponse = await fetch(`${MAIN_SSYSTEM_API}/api/student/${admissionNumber}`);
            if (studentResponse.ok) {
                this.studentData = await studentResponse.json();
                this.isConnected = true;
                console.log('✅ Connected to NCK System!');
                return true;
            }
        } catch (error) {
            console.warn('Main system not available:', error);
        }
        return false;
    }

    async getStudentMarks(admission) {
        try {
            const response = await fetch(`${MAIN_SYSTEM_API}/api/student-marks/${admission}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch marks:', error);
        }
        return [];
    }

    async getNCKScores(admission) {
        try {
            const response = await fetch(`${MAIN_SYSTEM_API}/api/nck-student/${admission}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch NCK scores:', error);
        }
        return null;
    }
}

window.systemBridge = new SystemIntegrationBridge();
