module Sample where

add :: Int -> Int -> Int
add a b = a + b

result :: Int
result = add 1 2

main :: IO ()
main = print result
