// components/CustomModal.js
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

const CustomModal = ({ visible, message, onCancel, onConfirm }) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.text}>{message}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
    elevation: 10,
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    color: '#000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: "row",
    gap: 20
  },
  cancelBtn: {
    backgroundColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    fontWeight: 'bold',
  },
  confirmBtn: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 8,
    fontWeight: 'bold',
  },
  cancelText: { color: "#000" },
  confirmText: { color: "#fff" }
});
