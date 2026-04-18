import { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../lib/supabase';

const DebugScreen = () => {
  const [testId, setTestId] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type }, ...prev]);
  };

  const runDbTest = async () => {
    if (!testId.trim()) {
      addLog("Please enter a User ID first", "error");
      return;
    }

    setLoading(true);
    setLogs([]); // Clear previous logs
    addLog(`Starting test for ID: ${testId}`);

    try {
      // 1. Fetch Check
      addLog("Fetching record...");
      const { data: fetchCheck, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', testId)
        .single();

      if (fetchError) {
        addLog(`Fetch Error: ${fetchError.message}`, "error");
        setLoading(false);
        return;
      }
      addLog(`Success! Found user: ${fetchCheck.role || 'No role set'}`, "success");

      // 2. Update Check
      addLog("Attempting update...");
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ 
            full_name: "Debug Test " + Math.floor(Math.random() * 100),
        })
        .eq('id', testId)
        .select();

      if (updateError) {
        addLog(`Update Error: ${updateError.message}`, "error");
      } else if (updateData && updateData.length === 0) {
        addLog("Match Failed: 0 rows updated. The ID exists but .eq() didn't catch it.", "error");
      } else {
        addLog("Update Successful!", "success");
        console.log("Updated row:", updateData[0]);
      }

    } catch (err) {
      addLog(`System Error: ${err.message}`, "error");
    } finally {
      setLoading(false);
      addLog("Debug Complete.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Debugger</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Paste User UUID here"
        placeholderTextColor="#888"
        value={testId}
        onChangeText={setTestId}
        autoCapitalize="none"
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={runDbTest}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Run Diagnostic</Text>}
      </TouchableOpacity>

      <View style={styles.logContainer}>
        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>Logs</Text>
          <TouchableOpacity onPress={() => setLogs([])}>
            <Text style={{color: '#D0021B'}}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scroll}>
          {logs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <Text style={styles.timestamp}>[{log.timestamp}]</Text>
              <Text style={[
                styles.message, 
                log.type === 'error' && styles.errorText,
                log.type === 'success' && styles.successText
              ]}>
                {log.message}
              </Text>
            </View>
          ))}
          {logs.length === 0 && <Text style={styles.empty}>No logs yet. Run a test.</Text>}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  input: { 
    backgroundColor: '#1E1E1E', 
    borderWidth: 1, 
    borderColor: '#333', 
    borderRadius: 8, 
    padding: 15, 
    color: '#fff', 
    marginBottom: 15,
    fontSize: 14
  },
  button: { 
    backgroundColor: '#D0021B', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logContainer: { flex: 1, marginTop: 30, backgroundColor: '#000', borderRadius: 8, padding: 10 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 5 },
  logTitle: { color: '#888', fontWeight: 'bold' },
  scroll: { flex: 1 },
  logEntry: { flexDirection: 'row', marginBottom: 8 },
  timestamp: { color: '#555', fontSize: 12, marginRight: 8 },
  message: { color: '#ddd', fontSize: 13, flex: 1 },
  errorText: { color: '#ff4444' },
  successText: { color: '#00C851' },
  empty: { color: '#444', textAlign: 'center', marginTop: 20 }
});

export default DebugScreen;