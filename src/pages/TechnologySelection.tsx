import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMap } from '@/context/MapContext'; // Импортируем useMap

const TechnologySelection: React.FC = () => {
  const { actions } = useMap(); // Получаем actions из контекста

  useEffect(() => {
    // Сбрасываем все данные карты при монтировании компонента TechnologySelection
    actions.resetMapData();
  }, [actions]); // Зависимость от actions, чтобы эффект запускался только при изменении actions (что маловероятно)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl shadow-lg bg-gray-100 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Выберите технологию для работы с картой</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col items-center">
          <p className="text-center text-gray-700 dark:text-gray-300">
            Выберите один из вариантов для настройки и анализа вашей карты.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <Link to="/zone-tracking">
              <Button className="w-full h-24 text-lg font-semibold">
                Зональный трекинг
              </Button>
            </Link>
            <Link to="/ble-beacons">
              <Button className="w-full h-24 text-lg font-semibold">
                BLE маяки
              </Button>
            </Link>
            <Link to="/aoa-antennas">
              <Button className="w-full h-24 text-lg font-semibold">
                AOA антенны
              </Button>
            </Link>
          </div>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              Вернуться к загрузке карты
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnologySelection;