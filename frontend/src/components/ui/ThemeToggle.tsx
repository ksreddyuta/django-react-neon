import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '../../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme } = useThemeContext();

  return (
    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton 
        onClick={toggleTheme} 
        color="inherit"
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: 1,
        }}
      >
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;