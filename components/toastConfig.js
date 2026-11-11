import { BaseToast, ErrorToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      allowFontScaling={false}
      style={{ borderLeftColor: '#4CAF50', backgroundColor: '#e6f4ea' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#2e7d32',
        maxFontSizeMultiplier: 1,
      }}
      text2Style={{
        fontSize: 14,
        color: '#2e7d32',
        maxFontSizeMultiplier: 1,
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      allowFontScaling={false}
      style={{ borderLeftColor: '#f44336', backgroundColor: '#fdecea' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#b71c1c',
        maxFontSizeMultiplier: 1,
      }}
      text2Style={{
        fontSize: 14,
        color: '#b71c1c',
        maxFontSizeMultiplier: 1,
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      allowFontScaling={false}
      style={{ borderLeftColor: '#F0A72D', backgroundColor: '#fcc378' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#1565c0',
        maxFontSizeMultiplier: 1,
      }}
      text2Style={{
        fontSize: 14,
        color: '#1565c0',
        maxFontSizeMultiplier: 1,
      }}
    />
  ),
  common: ({ text1 }) => (
    <BaseToast
      style={{
        backgroundColor: '#000',
        borderLeftColor: '#000',
        paddingVertical: 0,
        borderRadius: 5,
        alignSelf: 'center',
      }}
      contentContainerStyle={{ paddingHorizontal: 5 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
      }}
      text1={text1}
      text2={null}  // Only one text
    />
  ),
};
