import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Button, 
  Chip 
} from '@mui/material'
import { useWebSocket } from '../../hooks/useWebSocket'
import { StreamRecommendation } from '../../../../backend/src/ml/services/recommendation.service'

interface StreamRecommendationsProps {
  userId: string
}

export const StreamRecommendations: React.FC<StreamRecommendationsProps> = ({ userId }) => {
  const [recommendations, setRecommendations] = useState<StreamRecommendation[]>([])
  const { socket } = useWebSocket('streaming')

  useEffect(() => {
    if (socket) {
      // Request recommendations when component mounts
      socket.emit('get_stream_recommendations', { userId })

      // Listen for recommendations
      socket.on('stream_recommendations', (data: StreamRecommendation[]) => {
        setRecommendations(data)
      })

      return () => {
        socket.off('stream_recommendations')
      }
    }
  }, [socket, userId])

  const handleJoinStream = (recommendation: StreamRecommendation) => {
    // Logic to join/navigate to recommended stream
    console.log('Joining stream:', recommendation)
  }

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Recommended Streams
      </Typography>
      <Grid container spacing={3}>
        {recommendations.map((recommendation, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ 
              maxWidth: 345, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column' 
            }}>
              <CardMedia
                component="img"
                height="140"
                image={`/placeholders/${recommendation.platform}.jpg`}
                alt={recommendation.streamerName}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="div">
                  {recommendation.streamerName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {recommendation.categories.map((category, catIndex) => (
                    <Chip 
                      key={catIndex} 
                      label={category} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  ))}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Recommendation Score: {(recommendation.recommendationScore * 100).toFixed(2)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Platform: {recommendation.platform}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  onClick={() => handleJoinStream(recommendation)}
                >
                  Join Stream
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
      {recommendations.length === 0 && (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          No recommendations available. Keep exploring!
        </Typography>
      )}
    </Box>
  )
}
