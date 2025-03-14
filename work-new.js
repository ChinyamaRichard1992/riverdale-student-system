// Supabase configuration
const SUPABASE_URL = 'https://wsnbdqqadxbmhtjmxjwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzbmJkcXFhZHhibWh0am14andxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2ODUzMjYsImV4cCI6MjA1NTI2MTMyNn0.68CIWGdlKU_LTrjS2QXkxY1Z4wPkharnrISS4eHcvnI';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Real-time sync functions
async function initializeDataPersistence() {
    try {
        // Subscribe to real-time changes
        const studentsSubscription = supabase
            .channel('students_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'students' },
                payload => handleRealtimeUpdate(payload)
            )
            .subscribe();

        const feesSubscription = supabase
            .channel('fees_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'school_fees' },
                payload => handleFeesUpdate(payload)
            )
            .subscribe();

        // Initial data load
        await loadDataFromSupabase();
        
        console.log('Real-time sync initialized');
        return true;
    } catch (error) {
        console.error('Error initializing real-time sync:', error);
        return false;
    }
}

async function loadDataFromSupabase() {
    try {
        // Load students
        const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('*')
            .order('student_number', { ascending: true });

        if (studentsError) throw studentsError;
        window.students = studentsData || [];

        // Load school fees
        const { data: feesData, error: feesError } = await supabase
            .from('school_fees')
            .select('*');

        if (feesError) throw feesError;
        window.schoolFees = feesData.reduce((acc, fee) => {
            acc[fee.grade] = fee.amount;
            return acc;
        }, {});

        // Update UI
        updateDashboard();
        updateStudentTable();
        updateGradeSummary();
        
        console.log('Data loaded from Supabase');
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data from server', '#e74c3c');
        return false;
    }
}

async function saveDataInRealTime(data, table) {
    try {
        const { error } = await supabase
            .from(table)
            .upsert(data, {
                onConflict: table === 'students' ? 'student_number' : 'id',
                returning: 'minimal'
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error(`Error saving to ${table}:`, error);
        showNotification(`Error saving data to server`, '#e74c3c');
        return false;
    }
}

function handleRealtimeUpdate(payload) {
    console.log('Received student update:', payload);
    const { eventType, new: newData, old: oldData } = payload;

    switch (eventType) {
        case 'INSERT':
            if (!window.students.some(s => s.student_number === newData.student_number)) {
                window.students.push(newData);
            }
            break;
        case 'UPDATE':
            const updateIndex = window.students.findIndex(s => s.student_number === newData.student_number);
            if (updateIndex !== -1) {
                window.students[updateIndex] = { ...window.students[updateIndex], ...newData };
            }
            break;
        case 'DELETE':
            const deleteIndex = window.students.findIndex(s => s.student_number === oldData.student_number);
            if (deleteIndex !== -1) {
                window.students.splice(deleteIndex, 1);
            }
            break;
    }

    // Update UI
    updateDashboard();
    updateStudentTable();
    updateGradeSummary();
}

function handleFeesUpdate(payload) {
    console.log('Received fees update:', payload);
    const { eventType, new: newData } = payload;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
        window.schoolFees[newData.grade] = newData.amount;
    } else if (eventType === 'DELETE') {
        delete window.schoolFees[newData.grade];
    }

    // Update UI
    updateGradeSummary();
}

// Override existing functions to use Supabase
window.saveStudentToDB = async function(student, callback) {
    try {
        const success = await saveDataInRealTime(student, 'students');
        if (success && callback) callback();
        return success;
    } catch (error) {
        console.error('Error saving student:', error);
        return false;
    }
};

window.deleteStudentFromDB = async function(studentNumber) {
    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('student_number', studentNumber);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting student:', error);
        showNotification('Error deleting student from server', '#e74c3c');
        return false;
    }
};

window.addSchoolFees = async function() {
    const grade = document.getElementById('gradeSelect').value;
    const term = document.getElementById('termSelect').value;
    const year = document.getElementById('yearInput').value;

    if (!grade || !term || !year) {
        showNotification('Please select grade, term, and year', '#e74c3c');
        return false;
    }

    const fees = parseFloat(prompt(`Enter school fees for Grade ${grade}, Term ${term}, ${year}:`));
    
    if (isNaN(fees) || fees < 0) {
        showNotification('Please enter a valid amount', '#e74c3c');
        return false;
    }

    try {
        const success = await saveDataInRealTime({
            grade,
            amount: fees,
            term,
            year
        }, 'school_fees');

        if (success) {
            showNotification(`School fees set for Grade ${grade}`, '#4CAF50');
        }
        return success;
    } catch (error) {
        console.error('Error saving school fees:', error);
        showNotification('Error saving school fees to server', '#e74c3c');
        return false;
    }
};

window.deleteSchoolFees = async function() {
    const grade = document.getElementById('gradeSelect').value;

    if (!grade) {
        showNotification('Please select a grade', '#e74c3c');
        return false;
    }

    if (confirm(`Are you sure you want to delete school fees for Grade ${grade}?`)) {
        try {
            const { error } = await supabase
                .from('school_fees')
                .delete()
                .eq('grade', grade);

            if (error) throw error;
            showNotification(`School fees deleted for Grade ${grade}`, '#4CAF50');
            return true;
        } catch (error) {
            console.error('Error deleting school fees:', error);
            showNotification('Error deleting school fees from server', '#e74c3c');
            return false;
        }
    }
    return false;
};

// Initialize when the document loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const success = await initializeDataPersistence();
        if (success) {
            showNotification('Connected to server', '#4CAF50');
            console.log('Real-time sync system initialized');
        } else {
            throw new Error('Failed to initialize');
        }
    } catch (error) {
        console.error('Error initializing:', error);
        showNotification('Error connecting to server', '#e74c3c');
    }
});
