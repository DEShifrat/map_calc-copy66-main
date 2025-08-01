import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AOAAntennas: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-900 p-4">
      <Card className="w-full shadow-lg bg-gray-100 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">AOA антенны</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-700 dark:text-gray-300">
            Здесь будут инструменты для работы с барьерами, антеннами, коммутаторами и кабель-каналами.
          </p>
          {/* Здесь будет MapCore и элементы управления для AOA антенн */}
          <div className="flex justify-center">
            <Link to="/technology-selection">
              <Button variant="outline">
                Вернуться к выбору технологии
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AOAAntennas;